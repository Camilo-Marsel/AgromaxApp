# backend/core/views/inventario.py

import logging
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Producto, StockFinca, MovimientoInventario
from ..serializers import (
    ProductoSerializer, ProductoCreateUpdateSerializer,
    StockFincaSerializer, StockFincaCreateSerializer,
    MovimientoInventarioSerializer, MovimientoCreateSerializer,
)
from ..permissions import CanModifyData, FincaFilterMixin

logger = logging.getLogger(__name__)


class ProductoViewSet(viewsets.ModelViewSet):
    """Catálogo global de productos. Sin lógica de stock."""
    queryset = Producto.objects.prefetch_related('stocks__finca').all()
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    filterset_fields = ['categoria', 'unidad', 'activo']
    ordering = ['categoria', 'nombre']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductoCreateUpdateSerializer
        return ProductoSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def stocks(self, request, pk=None):
        """Todos los stocks de este producto (una entrada por finca)."""
        producto = self.get_object()
        qs = StockFinca.objects.filter(
            producto=producto, activo=True,
        ).select_related('finca')
        serializer = StockFincaSerializer(qs, many=True)
        return Response(serializer.data)


class StockFincaViewSet(FincaFilterMixin, viewsets.ModelViewSet):
    """
    Stock de un producto en una finca específica (o bodega central).
    Cada (producto, finca) es único.
    """
    queryset = StockFinca.objects.select_related(
        'producto', 'finca', 'created_by',
    ).all()
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['producto', 'finca', 'activo']
    ordering = ['producto__categoria', 'producto__nombre']
    finca_field = 'finca'

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return StockFincaCreateSerializer
        return StockFincaSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def stock_bajo(self, request):
        """Entradas con stock_actual <= stock_minimo."""
        finca_id = request.query_params.get('finca')
        qs = self.get_queryset().filter(activo=True, stock_minimo__gt=0)
        if finca_id:
            qs = qs.filter(finca_id=finca_id)
        # Filtramos en Python para no depender de expresiones F() con decimals
        bajos = [s for s in qs if s.stock_bajo]
        serializer = StockFincaSerializer(bajos, many=True)
        return Response({'count': len(bajos), 'results': serializer.data})

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Totales para el dashboard."""
        finca_id = request.query_params.get('finca')
        qs = self.get_queryset().filter(activo=True)
        if finca_id:
            qs = qs.filter(finca_id=finca_id)

        stocks = list(qs)
        bajo_stock = sum(1 for s in stocks if s.stock_bajo)

        por_categoria = {}
        for s in stocks:
            cat = s.producto.get_categoria_display()
            por_categoria[cat] = por_categoria.get(cat, 0) + 1

        return Response({
            'total_productos': len(stocks),
            'productos_bajo_stock': bajo_stock,
            'por_categoria': por_categoria,
        })


class MovimientoInventarioViewSet(viewsets.ModelViewSet):
    """Entradas, salidas y ajustes de inventario por stock_finca."""
    queryset = MovimientoInventario.objects.select_related(
        'stock_finca__producto', 'stock_finca__finca', 'created_by',
    ).all()
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['stock_finca', 'tipo']
    ordering = ['-fecha', '-created_at']
    http_method_names = ['get', 'post', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'create':
            return MovimientoCreateSerializer
        return MovimientoInventarioSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        stock_finca = serializer.validated_data['stock_finca']
        tipo        = serializer.validated_data['tipo']
        cantidad    = serializer.validated_data['cantidad']

        sf = StockFinca.objects.select_for_update().get(pk=stock_finca.pk)
        stock_antes = sf.stock_actual

        if tipo == 'ENTRADA':
            stock_despues = stock_antes + cantidad
        elif tipo == 'SALIDA':
            if cantidad > stock_antes:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    'cantidad': (
                        f'Stock insuficiente. Disponible: {stock_antes} '
                        f'{sf.producto.get_unidad_display()}.'
                    )
                })
            stock_despues = stock_antes - cantidad
        else:  # AJUSTE: cantidad es el nuevo stock absoluto
            stock_despues = cantidad

        sf.stock_actual = stock_despues
        sf.save(update_fields=['stock_actual', 'updated_at'])

        serializer.save(
            created_by=self.request.user,
            stock_antes=stock_antes,
            stock_despues=stock_despues,
        )

    @action(detail=False, methods=['get'])
    def por_stock(self, request):
        """Historial de movimientos para un stock_finca específico."""
        stock_id = request.query_params.get('stock_finca')
        if not stock_id:
            return Response(
                {'error': 'Se requiere el parámetro stock_finca.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        limit  = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))
        qs     = self.get_queryset().filter(stock_finca_id=stock_id)
        total  = qs.count()
        serializer = MovimientoInventarioSerializer(qs[offset:offset + limit], many=True)
        return Response({'count': total, 'results': serializer.data})
