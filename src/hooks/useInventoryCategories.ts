import { useLocalStorage } from "./useLocalStorage";

export const DEFAULT_CATEGORIES = [
  "Hortifrúti",
  "Carnes e Peixes",
  "Laticínios",
  "Padaria",
  "Mercearia",
  "Bebidas",
  "Congelados",
  "Higiene",
  "Limpeza",
  "Pet",
  "Outros",
];

export function useInventoryCategories() {
  const [customCategories, setCustomCategories] = useLocalStorage<string[]>(
    "inventory:custom_categories",
    []
  );

  const allCategories = [
    ...DEFAULT_CATEGORIES,
    ...customCategories.filter((c) => !DEFAULT_CATEGORIES.includes(c)),
  ];

  const addCategory = (name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed || allCategories.includes(trimmed)) return false;
    setCustomCategories((prev) => [...prev, trimmed]);
    return true;
  };

  const removeCategory = (name: string) => {
    if (DEFAULT_CATEGORIES.includes(name)) return;
    setCustomCategories((prev) => prev.filter((c) => c !== name));
  };

  return {
    allCategories,
    customCategories,
    defaultCategories: DEFAULT_CATEGORIES,
    addCategory,
    removeCategory,
  };
}
