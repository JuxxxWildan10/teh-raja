import { Product } from '@/data/menu';

type UserPreferences = {
    sweet: number;
    creamy: number;
    fruity: number;
};

// Calculate Euclidean Distance between two vectors
function calculateDistance(pref: UserPreferences, input: UserPreferences): number {
    return Math.sqrt(
        Math.pow(pref.sweet - input.sweet, 2) +
        Math.pow(pref.creamy - input.creamy, 2) +
        Math.pow(pref.fruity - input.fruity, 2)
    );
}

export function getRecommendations<T extends Product>(preferences: UserPreferences, currentProducts: T[]): T[] {
    // Sort products by distance (closest is best match)
    const ranked = currentProducts.map((product) => {
        const distance = calculateDistance(preferences, product.attributes);
        return { ...product, score: distance };
    }).sort((a, b) => a.score - b.score);

    // Return top 3 matches
    return ranked.slice(0, 3);
}
