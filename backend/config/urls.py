# backend/config/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status


REFRESH_COOKIE = 'refresh_token'
REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24  # 1 día en segundos


def _set_refresh_cookie(response, token):
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=not settings.DEBUG,
        samesite='None' if not settings.DEBUG else 'Lax',
        path='/api/auth/refresh/',
    )


class CookieTokenObtainPairView(TokenObtainPairView):
    """Login: devuelve access en body, refresh como cookie httpOnly."""
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            _set_refresh_cookie(response, response.data.pop('refresh'))
        return response


class CookieTokenRefreshView(APIView):
    """Refresh silencioso: lee el refresh de la cookie, devuelve nuevo access."""
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE)
        if not refresh_token:
            return Response(
                {'detail': 'No refresh token'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            raise InvalidToken(e.args[0])

        return Response({'access': serializer.validated_data['access']})


class LogoutView(APIView):
    """Logout: elimina la cookie de refresh."""
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({'detail': 'Logged out'}, status=status.HTTP_200_OK)
        response.delete_cookie(
            REFRESH_COOKIE,
            path='/api/auth/refresh/',
            samesite='None' if not settings.DEBUG else 'Lax',
        )
        return response


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

    # JWT Authentication
    path('api/auth/login/', CookieTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/auth/me/', current_user, name='current_user'),

    # Core app URLs (todas las rutas de API están aquí)
    path('api/', include('core.urls')),
]

# Servir archivos media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)