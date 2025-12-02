# backend/core/filters.py

from django_filters import rest_framework as filters
from django.db import models 
from .models import Trabajador, Labor, RegistroLabor, Nomina, Prestamo

class TrabajadorFilter(filters.FilterSet):
    estado = filters.ChoiceFilter(choices=Trabajador.ESTADO_CHOICES)
    tipo_contrato = filters.NumberFilter(field_name='tipo_contrato__id')
    search = filters.CharFilter(method='filter_search')
    
    class Meta:
        model = Trabajador
        fields = ['estado', 'tipo_contrato']
    
    def filter_search(self, queryset, name, value):
        return queryset.filter(
            models.Q(nombres__icontains=value) |
            models.Q(apellidos__icontains=value) |
            models.Q(numero_documento__icontains=value)
        )


class LaborFilter(filters.FilterSet):
    activa = filters.BooleanFilter()
    unidad_medida = filters.NumberFilter(field_name='unidad_medida__id')
    es_especial = filters.BooleanFilter()
    
    class Meta:
        model = Labor
        fields = ['activa', 'unidad_medida', 'es_especial']


class RegistroLaborFilter(filters.FilterSet):
    trabajador = filters.NumberFilter(field_name='trabajador__id')
    quincena = filters.NumberFilter(field_name='quincena__id')
    fecha_desde = filters.DateFilter(field_name='fecha', lookup_expr='gte')
    fecha_hasta = filters.DateFilter(field_name='fecha', lookup_expr='lte')
    labor = filters.NumberFilter(field_name='labor__id')
    
    class Meta:
        model = RegistroLabor
        fields = ['trabajador', 'quincena', 'fecha_desde', 'fecha_hasta', 'labor']


class NominaFilter(filters.FilterSet):
    quincena = filters.NumberFilter(field_name='quincena__id')
    trabajador = filters.NumberFilter(field_name='trabajador__id')
    estado = filters.ChoiceFilter(choices=Nomina.ESTADO_CHOICES)
    
    class Meta:
        model = Nomina
        fields = ['quincena', 'trabajador', 'estado']


class PrestamoFilter(filters.FilterSet):
    trabajador = filters.NumberFilter(field_name='trabajador__id')
    estado = filters.ChoiceFilter(choices=Prestamo.ESTADO_CHOICES)
    tipo_pago = filters.ChoiceFilter(choices=Prestamo.TIPO_PAGO_CHOICES)
    
    class Meta:
        model = Prestamo
        fields = ['trabajador', 'estado', 'tipo_pago']