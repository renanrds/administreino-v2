from rest_framework.permissions import BasePermission
from users.access import user_has_moneyger_access


class HasMoneygerAccess(BasePermission):
    message = 'Acesso ao Moneyger não autorizado.'

    def has_permission(self, request, view):
        return user_has_moneyger_access(request.user)
