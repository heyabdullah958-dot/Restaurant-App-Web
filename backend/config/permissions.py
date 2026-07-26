"""
Custom DRF Permissions for FoodSphere Platform
Strict Multi-Tenant Scoping & Role-Based Access Control (RBAC)
"""
from rest_framework import permissions
from config.admin_utils import get_managed_branch, get_managed_restaurant

class IsSuperUser(permissions.BasePermission):
    """
    Allows access only to Django Superusers.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsBranchManagerForThisBranch(permissions.BasePermission):
    """
    Strict Tenant Isolation Permission:
    - Superusers have access to all branches.
    - Branch Managers can ONLY view/modify data explicitly assigned to their managed_branch or managed_restaurant.
    - Denies access (403 Forbidden) if a Branch Manager attempts to access another branch's resources.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and request.user.is_staff):
            return False
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True

        managed_branch = get_managed_branch(request.user)
        managed_restaurant = get_managed_restaurant(request.user)

        # Check object branch association
        obj_branch = getattr(obj, 'branch', None)
        if obj_branch:
            if managed_branch and obj_branch == managed_branch:
                return True
            if managed_restaurant and obj_branch.restaurant == managed_restaurant:
                return True
            return False

        # Check object restaurant association
        obj_restaurant = getattr(obj, 'restaurant', None)
        if obj_restaurant:
            if managed_restaurant and obj_restaurant == managed_restaurant:
                return True
            if managed_branch and obj_restaurant == managed_branch.restaurant:
                return True
            return False

        # Direct Branch model check
        from restaurants.models import Branch
        if isinstance(obj, Branch):
            if managed_branch and obj == managed_branch:
                return True
            if managed_restaurant and obj.restaurant == managed_restaurant:
                return True
            return False

        return False
