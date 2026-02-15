# 🍵 Teh Raja - Premium Tea Shop Management System

A Modern, Real-time Point of Sale (POS) and Ordering System built for **Teh Raja**.
Designed to bridge the gap between customers and cashiers with instant synchronization.

![Teh Raja Banner](/public/icons/icon-512x512.png)

## 🚀 Key Features (Fitur Unggulan)

### 1. ⚡ Real-time Synchronization
-   **Instant Order Updates**: Orders placed by customers on their device appear **instantly** on the Admin Dashboard without refreshing (powered by **Firebase Realtime Database**).
-   **Live Status Tracking**: Customers can see their tea being made ("Is Preparing") and finished ("Ready") in real-time.

### 2. 🔔 Interactive Audio Feedback
-   **Admin Alert**: "Chime" sound when a new order arrives.
-   **Customer Alert**: "Ding" sound when order status changes.
-   Increases engagement and ensures no order is missed during busy hours.

### 3. 📱 PWA (Progressive Web App) Support
-   **Installable**: Can be installed on Android/iOS/Windows as a native-like app.
-   **Offline Capable**: Basic UI loads even without internet.
-   **App-like Feel**: Fullscreen experience with smooth animations.

### 4. 🛠️ Comprehensive Admin Dashboard
-   **Order Management**: Process, Complete, or Cancel orders.
-   **Sales Logging**: Tracks every action for accountability.
-   **Notification Badge**: Visual counter for pending orders.

### 5. 🎨 Premium UI/UX
-   **Gold & Forest Theme**: Elegant design matching the brand identity.
-   **Smart Cart**: "Add to Cart" with quantity controls and receipt generation.
-   **Recommendation Quiz**: Helps customers choose their perfect tea.

---

## 🛠️ Technology Stack (Teknologi yang Digunakan)

-   **Frontend**: [Next.js 15](https://nextjs.org/) (React Framework)
-   **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Type Safety)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) + Framer Motion (Animations)
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand) (Local & Global State)
-   **Backend / Database**: [Firebase Realtime Database](https://firebase.google.com/)
-   **Deployment**: Vercel / Netlify

---

## 📦 Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/username/teh-raja.git
    cd teh-raja
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Setup Environment Variables**
    Create a `.env.local` file and add your Firebase credentials:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
    # (See Firebase Console for full list)
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

5.  **Open Browser**
    Visit `http://localhost:3000`

---

## 👨‍💻 Project Structure

-   `/app`: Next.js App Router pages (Admin & User).
-   `/components`: Reusable UI components (Cart, Overlay, Sync).
-   `/lib`: Helper functions (Firebase init, Zustand Stores).
-   `/data`: Static menu data.

---

Built with ❤️ for **PKL Project 2026**.
