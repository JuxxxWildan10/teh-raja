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
        name: 'Royale Milk Tea',
        price: 5000,
        description: 'Teh melati signature dipadukan dengan susu segar premium .',
        image: '/images/royal-milk-tea.png',
        category: 'signature',
        attributes: { sweet: 8, creamy: 9, fruity: 0 }
    },
    {
        id: '2',
        name: 'Imperial Jasmine',
        price: 3000,
        description: 'Teh melati wangi yang harum dan menenangkan .',
        image: '/images/jasmine-honey.png',
        category: 'classic',
        attributes: { sweet: 6, creamy: 0, fruity: 2 }
    },
    {
        id: '3',
        name: 'Teh Tarik Istimewa',
        price: 7000,
        description: 'Paduan yang istimewa antara teh dan susu segar.',
        image: '/images/sakura-berry.png',
        category: 'fruit',
        attributes: { sweet: 9, creamy: 7, fruity: 9 }
    },
    {
        id: '4',
        name: 'The Great Matcha Latte',
        price: 7000,
        description: 'Matcha otentik  dengan susu segar, pekat dan bersahaja.',
        image: '/images/matcha-latte.png',
        category: 'milk',
        attributes: { sweet: 5, creamy: 8, fruity: 0 }
    },
    {
        id: '5',
        name: 'Tropical Milk Tea Mango ',
        price: 7000,
        description: 'Teh mangga menyegarkan dan creamy.',
        image: '/images/mango-breeze.png',
        category: 'fruit',
        attributes: { sweet: 7, creamy: 2, fruity: 10 }
    },
    {
        id: '6',
        name: 'Lychee Tea',
        price: 7000,
        description: 'Sajian minuman teh dengan leci yang segar.',
        image: '/images/oolong.png',
        category: 'classic',
        attributes: { sweet: 1, creamy: 0, fruity: 5 }
    }
];
