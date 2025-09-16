# Overview

Galaxiga is a classic space shooter game built as a modern web application with social features and Farcaster Mini App integration. The game recreates the nostalgic Galaga arcade experience with contemporary graphics, real-time multiplayer capabilities, and blockchain-based achievements. Players control a spaceship to defend against waves of alien enemies while competing on global leaderboards and earning NFT rewards.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built with React and TypeScript using Vite as the build tool. The UI leverages Tailwind CSS for styling with Radix UI components for accessibility. Three.js powers the 3D graphics and game rendering through React Three Fiber. The application follows a component-based architecture with clear separation between game logic, UI components, and state management.

The game engine is implemented as a custom GameEngine class that handles player movement, enemy spawning, collision detection, and rendering. Touch controls are optimized for mobile devices with responsive design patterns ensuring compatibility across different screen sizes.

## Backend Architecture
The server uses Express.js with TypeScript, configured for both development and production environments. The API follows RESTful principles with route handlers organized in a modular structure. Authentication is implemented using JWT tokens with bcrypt for password hashing. Game state validation includes encrypted data to prevent cheating.

Rate limiting and security middleware (Helmet, CORS) protect against common vulnerabilities. The server handles both API endpoints and static file serving for the built frontend.

## Data Storage
Database operations use Drizzle ORM with PostgreSQL (configured for Neon serverless). The schema includes comprehensive tables for users, player statistics, game sessions, high scores, player rankings, and user achievements. This design supports detailed player analytics, leaderboards, and social features.

The storage layer implements an abstraction pattern with interfaces, allowing for easy database provider changes while maintaining type safety throughout the application.

## Authentication and Social Integration
The application integrates with Farcaster's social protocol, supporting Mini App functionality within the Farcaster ecosystem. Users can authenticate through their Farcaster accounts, enabling social features like friend leaderboards and sharing achievements.

Web3 integration includes wallet connectivity for NFT rewards and blockchain-based achievements. The system supports Base network integration for token rewards and social proof mechanisms.

## Game Systems
The game implements advanced features including haptic feedback for mobile devices, accessibility support with screen reader compatibility, and audio management with multiple sound layers. The game state management uses Zustand for predictable state updates across components.

Real-time features include live leaderboards, social sharing with custom image generation, and push notifications for game events. The architecture supports both single-player and multiplayer game modes with encrypted game state validation.

# External Dependencies

## Core Framework Dependencies
- **React & TypeScript**: Frontend framework with full type safety
- **Vite**: Build tool and development server with HMR support
- **Express.js**: Backend web framework with middleware support
- **Three.js & React Three Fiber**: 3D graphics rendering and game engine

## Database and Storage
- **Drizzle ORM**: Type-safe database operations and migrations
- **Neon PostgreSQL**: Serverless PostgreSQL database hosting
- **Database schema**: Comprehensive player data, statistics, and social features

## UI and Styling
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Radix UI**: Accessible component primitives for complex UI elements
- **Framer Motion**: Animation library for smooth UI transitions
- **Phosphor Icons**: Comprehensive icon library for consistent iconography

## Social and Web3 Integration
- **Farcaster SDK**: Mini App integration and social protocol connectivity
- **Neynar API**: Farcaster data and social graph access
- **Wagmi**: React hooks for Ethereum wallet integration
- **Base Network**: Blockchain integration for NFT rewards and achievements

## Audio and UX
- **Web Audio API**: Game sound effects and background music management
- **Vibration API**: Haptic feedback for mobile game interactions
- **Canvas API**: Custom graphics rendering and dynamic image generation

## Development and Production
- **ESBuild**: Fast JavaScript bundling for production builds
- **PostCSS & Autoprefixer**: CSS processing and browser compatibility
- **Express Rate Limiting**: API protection and abuse prevention
- **Helmet**: Security middleware for HTTP headers and XSS protection