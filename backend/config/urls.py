# backend/config/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Retorna información del usuario autenticado incluyendo su rol"""
    user = request.user
    rol_info = None
    if user.rol:
        rol_info = {
            'id': user.rol.id,
            'nombre': user.rol.nombre,
            'nombre_display': user.rol.get_nombre_display(),
        }

    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'nombre_completo': user.get_full_name() or user.username,
        'rol': rol_info,
        'es_activo': user.es_activo,
    })


urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT Authentication (sin CSRF - JWT maneja autenticación)
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', current_user, name='current_user'),

    # Core app URLs (todas las rutas de API están aquí)
    path('api/', include('core.urls')),
]

# Servir archivos media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)