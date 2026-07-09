

export const PERMISSIONS_DICTIONARY = [
  {
    module: 'Zamawiarka',
    permissions: [
      { key: 'can_view_zamawiarka', label: 'Dostęp do Zamawiarki (podgląd towarów)' },
      { key: 'can_create_orders', label: 'Składanie zamówień (koszyk i PDF)' },
      { key: 'can_edit_products', label: 'Zarządzanie bazą towarów i hurtowniami' }
    ]
  },
  {
    module: 'Rentowność (Food Cost)',
    permissions: [
      { key: 'can_view_foodcost', label: 'Dostęp do Rentowności (podgląd)' },
      { key: 'can_edit_menu', label: 'Zarządzanie menu, cenami i recepturami' }
    ]
  },
  {
    module: 'Zarządzanie Aplikacją',
    permissions: [
      { key: 'can_manage_roles', label: 'Zarządzanie stanowiskami (tworzenie ról)' },
      { key: 'can_manage_employees', label: 'Zarządzanie zespołem (konta i PIN)' }
    ]
  }
];