export type Product = {
    id: string;
    name: string;
    price: number;
    description: string;
    image: string;
    category: 'signature' | 'milk' | 'fruit' | 'classic';
    attributes: {
        sweet: number;  // 0-10
        creamy: number; // 0-10
        fruity: number; // 0-10
    };
};

export const products: Product[] = [
    {
        id: '1',
        name: 'Royal Golden Milk Tea',
        price: 18000,
        description: 'Signature black tea blended with premium fresh milk and golden brown sugar.',
        image: '/images/royal-milk-tea.png',
        category: 'signature',
        attributes: { sweet: 8, creamy: 9, fruity: 0 }
    },
    {
        id: '2',
        name: 'Imperial Jasmine Honey',
        price: 15000,
        description: 'Fragrant jasmine tea with organic honey and aloe vera toppings.',
        image: '/images/jasmine-honey.png',
        category: 'classic',
        attributes: { sweet: 6, creamy: 0, fruity: 2 }
    },
    {
        id: '3',
        name: 'Sakura Berry Frappe',
        price: 22000,
        description: 'Japanese sakura essence blended with strawberry and cream cheese foam.',
        image: '/images/sakura-berry.png',
        category: 'fruit',
        attributes: { sweet: 9, creamy: 7, fruity: 9 }
    },
    {
        id: '4',
        name: 'Kyoto Macha Latte',
        price: 20000,
        description: 'Imported matcha from Kyoto with fresh milk, rich and earthy.',
        image: '/images/matcha-latte.png',
        category: 'milk',
        attributes: { sweet: 5, creamy: 8, fruity: 0 }
    },
    {
        id: '5',
        name: 'Tropical Mango Breeze',
        price: 18000,
        description: 'Refreshing mango tea with real mango chunks and mint leaves.',
        image: '/images/mango-breeze.png',
        category: 'fruit',
        attributes: { sweet: 7, creamy: 1, fruity: 10 }
    },
    {
        id: '6',
        name: 'Dark Roasted Oolong',
        price: 14000,
        description: 'Pure roasted oolong tea, strong and energetic.',
        image: '/images/oolong.png',
        category: 'classic',
        attributes: { sweet: 1, creamy: 0, fruity: 0 }
    }
];
