import { Utensils, Heart, Stethoscope, Brain, Sparkles, ShoppingBag } from 'lucide-react';

export const CATEGORIES_CONFIG = {
    'Strava': { bg: '#BCE5FC', color: '#105A8A', icon: Utensils },
    'Starostlivosť': { bg: '#D4C4F0', color: '#41228E', icon: Heart },
    'Zdravie': { bg: '#FFF5C3', color: '#A86C00', icon: Stethoscope },
    'Správanie': { bg: '#b8e2ceff', color: '#4a9f74ff', icon: Brain },
    'Zaujímavosti': { bg: '#ffe0edff', color: '#82163E', icon: Sparkles },
    'Produkty': { bg: '#F8E8D4', color: '#7A3F00', icon: ShoppingBag },
};

export const getCategoryConfig = (categoryName) => {
    return CATEGORIES_CONFIG[categoryName] || { bg: '#fdf6f6', color: '#3C0919', icon: null };
};
