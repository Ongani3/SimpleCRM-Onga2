# Onga's Simple CRM Application Briefing

## Executive Summary

This is a **dual-portal Customer Relationship Management (CRM) system** built with React, TypeScript, Tailwind CSS, and Supabase. The application serves both **business administrators** (store owners) and **customers** through separate portals with role-based access control.

---

## Application Architecture

### Frontend Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom UI components (shadcn/ui)
- **Routing**: React Router DOM
- **State Management**: React Query (TanStack Query) for server state
- **Authentication**: Supabase Auth with role-based access

### Backend Infrastructure
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime subscriptions
- **Edge Functions**: Supabase Edge Functions for server-side logic
- **Email Service**: Resend API for promotional emails

---

## Application Structure

### Dual Portal Architecture

#### 1. **Admin Portal** (`/` route)
- **Purpose**: Business management dashboard for store owners
- **Access**: Admin users only (role: 'admin')
- **Features**: Complete CRM functionality, customer management, sales tracking

#### 2. **Customer Portal** (`/customer` route)  
- **Purpose**: Customer self-service interface
- **Access**: Customer users only (role: 'customer')
- **Features**: Account management, loyalty program, order history, support

### Key Application Routes
```
/ (Index) → CRM Dashboard (Admin only)
/auth → Admin authentication
/customer → Customer Portal Dashboard
/customer/auth → Customer authentication
/customer/:customerId → Individual customer details
/settings → Admin settings
/email-confirmation → Email verification
```

---

## Database Schema Overview

The database consists of **33 tables** organized into logical domains:

### Core User Management
- **`user_roles`**: Role-based access control (admin/customer)
- **`profiles`**: Basic user profile information
- **`customer_profiles`**: Extended customer profile data
- **`store_settings`**: Business configuration and settings

### Customer Relationship Management
- **`customers`**: Master customer records with spending/loyalty data
- **`customer_addresses`**: Multiple addresses per customer
- **`loyalty_accounts`**: Point balances and tier management
- **`points_transactions`**: Point earning/redemption history

### Sales & Commerce
- **`sales`**: Individual sales transactions
- **`daily_sales_summary`**: Aggregated daily sales data
- **`orders`**: E-commerce order management
- **`order_items`**: Line items for orders
- **`payments`**: Payment processing records

### Business Operations
- **`quotes`**: Sales quotations
- **`invoices`**: Billing and invoicing
- **`services`**: Service offerings and appointments
- **`promotions`**: Discount and promotion management
- **`rewards`**: Loyalty reward catalog

### Communication & Marketing
- **`promotional_emails`**: Marketing campaign templates
- **`email_campaigns`**: Campaign execution tracking
- **`notifications`**: In-app notifications

### Communication Features
- **`call_sessions`**: ZegoCloud call management
- **`call_logs`**: Call history and quality metrics
- **`user_presence`**: Real-time online status

---

## Key Features by Portal

### Admin Portal Features

#### **Dashboard & Analytics**
- Real-time sales metrics and KPIs
- Customer acquisition and retention analytics
- Revenue trending and forecasting

#### **Customer Management**
- Complete customer database with search/filtering
- Customer profiles with purchase history
- Loyalty tier management and point tracking
- Customer communication history

#### **Sales Management**
- Sales history and reporting
- Daily/monthly sales summaries

#### **Quotes & Invoicing**
- Professional quote generation
- Invoice creation and management
- Payment status tracking
- "Mark as Paid" functionality

#### **Marketing & Promotions**
- Promotional email campaigns
- Discount/promotion management
- Customer segmentation for targeted marketing
- Email open/click tracking

#### **Communication Tools**
- Zegocloud audio/video calling
- Real-time presence indicators
- Call history and quality metrics
- Customer complaint management

#### **Business Operations**
- Store settings and configuration(Admin Accounts)
- Staff management and permissions

### Customer Portal Features

#### **Personal Dashboard**
- Account overview with spending summary
- Loyalty points balance and tier status
- Tier-specific benefits display
- Recent activity timeline

#### **Loyalty Program**
- Points earning and redemption
- Tier progression tracking (Bronze → Silver → Gold → Platinum)
- Exclusive member benefits
- Reward catalog browsing

#### **Self-Service Tools**
- Order history and tracking
- Profile management
- Address book management

#### **Communication**
- Direct calling to store via Zegocloud
- Review and feedback from Customer Servicce

---

## Security & Access Control

### Row-Level Security (RLS)
Every table implements comprehensive RLS policies ensuring:
- **Admin users** can only access their own store's data
- **Customer users** can only view/modify their own records
- **Cross-tenant isolation** prevents data leakage between stores

### Authentication Flow
1. **Role Detection**: System determines user role upon login
2. **Portal Routing**: Users automatically redirected to appropriate portal
3. **Session Management**: Persistent sessions with automatic token refresh
4. **Secure Sign-out**: Complete session cleanup on logout

### Key Security Features
- Email verification for new accounts
- Encrypted password storage
- JWT token-based authentication
- Real-time session validation
- Automatic role-based redirects

---

## Real-time Capabilities

### Live Data Updates
- **Sales Metrics**: Real-time dashboard updates
- **Customer Activity**: Live notification of customer actions
- **Inventory Changes**: Instant stock level updates
- **Communication**: Real-time messaging and call notifications

### Presence System
- Online/offline status tracking
- Last seen timestamps
- Activity-based presence updates
- Automatic cleanup on disconnect

---

## Integration Points

### Email Marketing
- **Resend API**: Transactional and promotional emails
- **Campaign Management**: Template-based email campaigns
- **Analytics**: Open rates, click tracking, conversion metrics


### Communication
- **ZegoCloud**: Browser-based audio/video calling and messaging API

---

## Data Flow Patterns

### Customer Lifecycle
1. **Registration** → Profile creation in both `customers` and `customer_profiles`
2. **First Purchase** → Points awarded, tier calculation, loyalty account update
3. **Ongoing Engagement** → Sales tracking, promotion targeting, review collection
4. **Support Interactions** → Ticket creation, resolution tracking, satisfaction surveys

### Sales Process
1. **Transaction Recording** → `sales` table insert
2. **Customer Update** → Automatic points calculation and tier adjustment
3. **Summary Generation** → Daily aggregation via database triggers
4. **Reporting** → Real-time dashboard updates

### Marketing Automation
1. **Campaign Creation** → Template design and audience segmentation
2. **Email Deployment** → Batch processing via edge functions
3. **Performance Tracking** → Open/click rate collection
4. **Follow-up Actions** → Automated sequences based on engagement

---

## Technical Considerations for AI Agents

### Database Patterns
- **Consistent UUID primary keys** across all tables
- **Timestamp tracking** (`created_at`, `updated_at`) on all entities
- **Soft delete patterns** where appropriate
- **Audit trails** for sensitive operations

### API Patterns
- **Supabase client** for all database operations
- **Row-level security** enforced at database level
- **Real-time subscriptions** for live updates
- **Edge functions** for complex business logic

### Error Handling
- **Comprehensive error messages** with specific database error details
- **Toast notifications** for user feedback
- **Graceful degradation** when services are unavailable
- **Retry mechanisms** for failed operations

### Performance Optimizations
- **Database indexing** on frequently queried columns
- **Query optimization** with select specific columns
- **Real-time subscription management** to prevent memory leaks
- **Lazy loading** for large datasets

---

## Development Guidelines

### Code Organization
- **Component-based architecture** with reusable UI elements
- **Custom hooks** for data fetching and business logic
- **Utility functions** for common operations
- **Type safety** throughout with TypeScript

### State Management
- **Server state** managed via React Query
- **Client state** managed via React hooks
- **Real-time updates** via Supabase subscriptions
- **Form state** managed via React Hook Form

### Styling Approach
- **Tailwind CSS** for utility-first styling
- **shadcn/ui components** for consistent design system
- **Responsive design** with mobile-first approach
- **Dark mode support** via theme provider

This CRM system represents a complete business solution with clear separation of concerns, robust security, and scalable architecture suitable for small to medium-sized businesses managing customer relationships and sales operations.
