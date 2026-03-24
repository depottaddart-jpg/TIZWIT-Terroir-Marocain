# 🌿 Coopérative Al Hikma – E-commerce de Produits du Terroir
Une solution e-commerce légère, élégante et performante conçue pour les coopératives artisanales marocaines. Ce site permet de présenter un catalogue de produits (huiles, miels, épices) et de faciliter les commandes via WhatsApp sans avoir besoin d'un serveur complexe.

## 🚀 Fonctionnalités principales
Catalogue Dynamique : Affichage automatique des produits à partir d'un fichier JSON.

Filtres Intelligents : Tri par catégories (Huiles, Miels, Tisanes, Épices, etc.).

Système de Panier complet : Ajout, modification de quantité et persistance des données via localStorage.

Commande WhatsApp : Tunnel de vente optimisé qui génère un message structuré directement vers le numéro de la coopérative.

Générateur de Catalogue PDF : Conversion du catalogue web en document PDF professionnel avec images, prix et poids, prêt pour l'impression ou le partage.

Design Responsive : Optimisé pour mobile, tablette et desktop avec une esthétique "Terroir" utilisant Tailwind CSS.

Performance : Chargement rapide (zéro framework lourd, uniquement du Vanilla JS).

## 🛠️ Stack Technique
### Frontend : HTML5, CSS3 (Custom variables), JavaScript (ES6+).

### Style : Tailwind CSS pour la mise en page rapide et moderne.

### Icônes : Lucide Icons pour une interface épurée.

### PDF : jsPDF pour la génération de documents côté client.

### Images : Support du format WebP avec conversion automatique pour la compatibilité PDF.

## 📁 Structure du Projet
Plaintext
├── index.html      # Structure de la page et conteneurs UI
├── style.css       # Design personnalisé, animations et thèmes de couleurs
├── script.js       # Logique métier : Panier, WhatsApp, et moteur PDF
├── products.json   # Base de données des produits (Simple à modifier)
└── README.md       # Documentation du projet
## ⚙️ Configuration & Installation
### 1. Paramétrer WhatsApp
Ouvrez le fichier script.js et modifiez la première ligne :

JavaScript
const WHATSAPP_NUMBER = '212612345678'; // Votre numéro international sans '+'
### 2. Gérer les Produits
Modifiez simplement products.json pour ajouter vos articles :

JSON
{
  "id": 1,
  "name": "Huile d'argan bio",
  "price": 120,
  "image": "URL_DE_L_IMAGE",
  "category": "Huiles",
  "weight": "250 ml"
}
### 3. Lancement local
Comme le projet utilise fetch() pour charger les produits, il doit être ouvert via un serveur local :

VS Code : Utilisez l'extension "Live Server".

Python : python -m http.server 8000

Node.js : npx serve .

Développé avec passion pour le terroir marocain.
## hicham.gr90@gmail.com
