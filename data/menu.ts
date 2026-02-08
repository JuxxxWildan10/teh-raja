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
        image: 'https://i.pinimg.com/736x/0b/e7/b8/0be7b87d66b4d16ec60455d1d81abbe8.jpg',
        category: 'signature',
        attributes: { sweet: 8, creamy: 9, fruity: 0 }
    },
    {
        id: '2',
        name: 'Imperial Jasmine',
        price: 3000,
        description: 'Teh melati wangi yang harum dan menenangkan .',
        image: 'https://i.pinimg.com/736x/15/0d/e4/150de4882a02714ec9c4f585f29a433e.jpg',
        category: 'classic',
        attributes: { sweet: 6, creamy: 0, fruity: 2 }
    },
    {
        id: '3',
        name: 'Teh Tarik Istimewa',
        price: 7000,
        description: 'Paduan yang istimewa antara teh dan susu segar.',
        image: 'https://i.pinimg.com/736x/2a/74/7d/2a747d0502b31ca988ccbb4b8ac9af84.jpg',
        category: 'fruit',
        attributes: { sweet: 9, creamy: 7, fruity: 9 }
    },
    {
        id: '4',
        name: 'The Great Matcha Latte',
        price: 7000,
        description: 'Matcha otentik  dengan susu segar, pekat dan bersahaja.',
        image: 'https://i.pinimg.com/736x/dc/c9/ce/dcc9cece545e7f612d6ad61fd4f3f552.jpg',
        category: 'milk',
        attributes: { sweet: 5, creamy: 8, fruity: 0 }
    },
    {
        id: '5',
        name: 'Tropical Milk Tea Mango ',
        price: 7000,
        description: 'Teh mangga menyegarkan dan creamy.',
        image: 'https://i.pinimg.com/1200x/88/ea/83/88ea83064077c3bc9aac22a359f02180.jpg',
        category: 'fruit',
        attributes: { sweet: 7, creamy: 2, fruity: 10 }
    },
    {
        id: '6',
        name: 'Lychee Tea',
        price: 7000,
        description: 'Sajian minuman teh dengan leci yang segar.',
        image: 'https://i.pinimg.com/736x/8d/43/37/8d4337f052681194d09bc7af73d93c44.jpg',
        category: 'classic',
        attributes: { sweet: 1, creamy: 0, fruity: 5 }
    }
];
