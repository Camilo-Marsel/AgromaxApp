# backend/core/views/inventario.py

import logging
from django.db import transaction
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend

from ..models import Producto, MovimientoInventario
from ..serializers import (
    ProductoListSerializer,
    ProductoCreateUpdateSerializer,
    MovimientoInventarioSerializer,
    MovimientoInventarioCreateSerializer,
)
from ..permissions import CanModifyData, FincaFilterMixin

logger = logging.getLogger(__name__)


class ProductoViewSet(FincaFilterMixin, viewsets.ModelViewSet):
    """Gestión del catálogo de productos de inventario."""
    queryset = Producto.objects.select_related('finca', 'created_by').all()
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    filterset_fields = ['categoria', 'unidad', 'activo', 'finca']
    ordering = ['categoria', 'nombre']
    finca_field = 'finca'

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductoCreateUpdateSerializer
        return ProductoListSerializer

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            stock_actual=self.request.data.get('stock_inicial', 0),
        )

    @action(detail=False, methods=['get'])
    def stock_bajo(self, request):
        """Productos con stock_actual <= stock_minimo."""
        qs = self.get_queryset().filter(
            activo=True,
            stock_minimo__gt=0,
        ).extra(where=['stock_actual <= stock_minimo'])
        serializer = ProductoListSerializer(qs, many=True)
        return Response({
            'count': qs.count(),
            'results': serializer.data,
        })

    @action(detail=False, methods=['get'])
    def resumen(self, request):
        """Totales rápidos para el dashboard de inventario."""
        qs = self.get_queryset().filter(activo=True)
        total = qs.count()
        bajo_stock = qs.filter(
            stock_minimo__gt=0,
        ).extra(where=['stock_actual <= stock_minimo']).count()

        por_categoria = {}
        for p in qs:
            cat = p.get_categoria_display()
            por_categoria[cat] = por_categoria.get(cat, 0) + 1

        return Response({
            'total_productos': total,
            'productos_bajo_stock': bajo_stock,
            'por_categoria': por_categoria,
        })


class MovimientoInventarioViewSet(viewsets.ModelViewSet):
    """Registro de entradas, salidas y ajustes de inventario."""
    queryset = MovimientoInventario.objects.select_related(
        'producto', 'created_by'
    ).all()
    permission_classes = [CanModifyData]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['producto', 'tipo']
    ordering = ['-fecha', '-created_at']
    http_method_names = ['get', 'post', 'head', 'options']  # sin PUT/PATCH/DELETE

    def get_serializer_class(self):
        if self.action == 'create':
            return MovimientoInventarioCreateSerializer
        return MovimientoInventarioSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        producto = serializer.validated_data['producto']
        tipo     = serializer.validated_data['tipo']
        cantidad = serializer.validated_data['cantidad']

        # select_for_update evita race conditions en escritura concurrente
        producto = Producto.objects.select_for_update().get(pk=producto.pk)

        stock_antes = producto.stock_actual

        if tipo == 'ENTRADA':
            stock_despues = stock_antes + cantidad
        elif tipo == 'SALIDA':
            if cantidad > stock_antes:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    'cantidad': (
                        f'Stock insuficiente. Disponible: {stock_antes} '
                        f'{producto.get_unidad_display()}.'
                    )
                })
            stock_despues = stock_antes - cantidad
        else:  # AJUSTE: la cantidad es el nuevo stock absoluto
            stock_despues = cantidad
            cantidad = abs(stock_despues - stock_antes)

        producto.stock_actual = stock_despues
        producto.save(update_fields=['stock_actual', 'updated_at'])

        serializer.save(
            created_by=self.request.user,
            stock_antes=stock_antes,
            stock_despues=stock_despues,
        )

    @action(detail=False, methods=['get'])
    def por_producto(self, request):
        """Historial de movimientos de un producto específico."""
        producto_id = request.query_params.get('producto')
        if not producto_id:
            return Response(
                {'error': 'Se requiere el parámetro producto.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        qs = self.get_queryset().filter(producto_id=producto_id)

        # Paginación manual simple
        limit = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))
        total = qs.count()
        qs = qs[offset:offset + limit]

        serializer = MovimientoInventarioSerializer(qs, many=True)
        return Response({
            'count': total,
            'results': serializer.data,
        })
