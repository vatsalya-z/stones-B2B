# Database Schema

PostgreSQL schema managed via version-controlled Supabase migrations under `supabase/migrations/`.

## Architecture Conventions

- **Primary Keys**: UUID v4 via `gen_random_uuid()` (never serial/integer PKs).
- **Foreign Keys**: `ON DELETE RESTRICT` on commercial records (enquiries, quotes, audit logs) to prevent cascade deletion; `ON DELETE CASCADE` only where strictly owned (e.g. notifications, user roles).
- **Financial/Quantities**: `numeric(14, 2)` for currency amounts; `numeric(14, 3)` for quantities (supporting fractional metric tons, square meters/feet). Never `float` or `real`.
- **Search Paths**: `set search_path = ''` on all `SECURITY DEFINER` and trigger functions to eliminate search_path hijacking vulnerabilities.
- **Row-Level Security**: Enabled (`alter table ... enable row level security`) and enforced with default-deny on every table.
- **Audit Logging**: Append-only `admin_audit_logs` and `enquiry_status_history` enforced by `prevent_mutation()` trigger.

---

## Migrations Directory

| Migration File | Description | Key Tables & Objects |
| -------------- | ----------- | -------------------- |
| `20261030100000_foundation_identity.sql` | Core identity, roles, audit logs, and account guards | `profiles`, `user_roles`, `admin_audit_logs`, `has_role`, `is_admin`, `is_super_admin`, `handle_new_user` |
| `20261030100100_sellers.sql` | Seller onboarding, profiles, and verification documents | `seller_profiles`, `seller_verification_documents`, `public_seller_profiles` view, `is_seller_owner`, `is_seller_verified`, `submit_seller_verification`, `admin_review_seller` |
| `20261030100200_catalogue.sql` | Category hierarchy, products, specs, images, favourites, full-text search | `categories`, `products` (with generated `search_vector`), `product_images`, `product_specifications`, `product_favourites`, `admin_moderate_product` |
| `20261030100300_commerce.sql` | Enquiries, status history, quotes, items, state machines | `enquiries`, `enquiry_status_history`, `quotations`, `quotation_items`, `transition_enquiry_status` |
| `20261030100400_notifications.sql` | In-app notification engine | `notifications` |
| `20261030100500_storage.sql` | 6 storage buckets & RLS storage policies | `seller-logos`, `seller-cover-images`, `product-images`, `category-images`, `seller-documents`, `enquiry-attachments` |

---

## Tables & Views

### 1. `profiles`
Identity extension for `auth.users`. Automatically populated on signup via trigger.

| Column | Type | Constraints / Default | Description |
| ------ | ---- | --------------------- | ----------- |
| `id` | `uuid` | PK, references `auth.users(id)` ON DELETE CASCADE | User ID |
| `full_name` | `text` | Check 1..120 chars | User full name |
| `email` | `text` | Lowercase check | Contact email |
| `phone` | `text` | Optional | Phone number |
| `avatar_url` | `text` | Optional | Profile photo URL |
| `country` | `text` | Default `'India'` | Country |
| `state` | `text` | Optional | State / Province |
| `city` | `text` | Optional | City |
| `address` | `text` | Optional | Street address |
| `account_status` | `text` | Default `'active'`, check: `'active' \| 'suspended' \| 'deactivated'` | Moderation status |
| `created_at` | `timestamptz` | Default `now()` | Timestamp |
| `updated_at` | `timestamptz` | Default `now()` | Timestamp |

### 2. `user_roles`
Authoritative RBAC assignments. Client direct writes are strictly revoked.

| Column | Type | Constraints / Default | Description |
| ------ | ---- | --------------------- | ----------- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | Record ID |
| `user_id` | `uuid` | References `profiles(id)` ON DELETE CASCADE | User ID |
| `role` | `text` | Check: `'buyer' \| 'seller' \| 'admin' \| 'super_admin'` | Assigned role |
| `created_at` | `timestamptz` | Default `now()` | Timestamp |

- **Unique Constraint**: `(user_id, role)` prevents duplicate role assignments.

### 3. `seller_profiles`
Comprehensive stone business information and verification lifecycle.

| Column | Type | Constraints / Default | Description |
| ------ | ---- | --------------------- | ----------- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | Seller profile ID |
| `user_id` | `uuid` | References `profiles(id)` ON DELETE CASCADE, UNIQUE | Owning user |
| `business_name` | `text` | Check 2..150 chars | Trade / Legal name |
| `slug` | `text` | UNIQUE, alphanumeric + hyphens | Storefront URL slug |
| `business_type` | `text` | Check: `'manufacturer' \| 'mine_owner' \| 'supplier' \| 'exporter' \| 'wholesaler' \| 'retailer'` | Stone business classification |
| `owner_name` | `text` | Optional | Proprietor / Director name |
| `business_email` | `text` | Optional | Commercial contact email |
| `phone` | `text` | Optional | Primary phone |
| `whatsapp_number` | `text` | Optional | WhatsApp business number |
| `gst_number` | `text` | Optional, regex format check | Indian GSTIN (15 chars) |
| `business_address`| `text` | Optional | Facility / Office address |
| `city` | `text` | Optional | City |
| `state` | `text` | Optional | State |
| `country` | `text` | Default `'India'` | Country |
| `pincode` | `text` | Optional | Postal code |
| `website` | `text` | Optional | Company website URL |
| `years_in_business`| `integer`| Check >= 0 | Operational experience |
| `description` | `text` | Check <= 5000 chars | Overview / Factory details |
| `logo_url` | `text` | Optional | Brand mark storage path |
| `cover_image_url` | `text` | Optional | Storefront banner path |
| `verification_status`| `text` | Default `'unsubmitted'`, check: `'unsubmitted' \| 'submitted' \| 'under_review' \| 'verified' \| 'rejected'` | Trust badge status |
| `verified_at` | `timestamptz` | Optional | Timestamp of verification approval |
| `created_at` | `timestamptz` | Default `now()` | Timestamp |
| `updated_at` | `timestamptz` | Default `now()` | Timestamp |

### 4. `public_seller_profiles` (View)
Security view over `seller_profiles` exposing only verified sellers and safe public storefront columns. Excludes tax identifiers, private phone numbers, and internal moderation details.

### 5. `seller_verification_documents`
Private storage pointer for GST certificates, mining licenses, and incorporation documents.

| Column | Type | Constraints / Default | Description |
| ------ | ---- | --------------------- | ----------- |
| `id` | `uuid` | PK | Document ID |
| `seller_id` | `uuid` | References `seller_profiles(id)` ON DELETE CASCADE | Seller profile |
| `document_type` | `text` | Check: `'gst_certificate' \| 'pan_card' \| 'iec_certificate' \| 'business_registration' \| 'quarry_license' \| 'other'` | Document type |
| `storage_path` | `text` | Path validation enforced via trigger | Private storage object key |
| `verification_status` | `text` | Default `'pending'`, check: `'pending' \| 'approved' \| 'rejected'` | Review status |
| `rejection_reason` | `text` | Optional | Mandatory if rejected |
| `uploaded_at` | `timestamptz` | Default `now()` | Timestamp |
| `reviewed_at` | `timestamptz` | Optional | Review timestamp |
| `reviewed_by` | `uuid` | References `profiles(id)` | Reviewing admin |

### 6. `categories`
Hierarchical stone taxonomy supporting parent-child relationships (e.g., Marble -> Makrana White).

| Column | Type | Constraints / Default | Description |
| ------ | ---- | --------------------- | ----------- |
| `id` | `uuid` | PK | Category ID |
| `parent_id` | `uuid` | Self-referencing FK ON DELETE RESTRICT | Parent category |
| `name` | `text` | Check 2..100 chars | Category name |
| `slug` | `text` | UNIQUE | URL slug |
| `description` | `text` | Optional | Category overview |
| `image_url` | `text` | Optional | Showcase image URL |
| `is_active` | `boolean`| Default `true` | Visibility toggle |
| `display_order` | `integer`| Default `0` | Sort index |
| `seo_title` | `text` | Optional | Meta title |
| `seo_description` | `text` | Optional | Meta description |
| `created_at` | `timestamptz` | Default `now()` | Timestamp |
| `updated_at` | `timestamptz` | Default `now()` | Timestamp |

### 7. `products`
Stone product catalog with dimensional attributes, pricing models, and moderation controls.

| Column | Type | Constraints / Default | Description |
| ------ | ---- | --------------------- | ----------- |
| `id` | `uuid` | PK | Product ID |
| `seller_id` | `uuid` | References `seller_profiles(id)` ON DELETE RESTRICT | Selling entity |
| `category_id` | `uuid` | References `categories(id)` ON DELETE SET NULL | Category classification |
| `name` | `text` | Check 3..200 chars | Product title |
| `slug` | `text` | UNIQUE | SEO slug |
| `sku` | `text` | Optional, UNIQUE per seller | Seller inventory SKU |
| `description` | `text` | Optional, <= 10000 chars | Technical specification & details |
| `material_type` | `text` | Optional | Makrana, Granite, Kota, etc. |
| `stone_origin` | `text` | Optional | Quarry / Region of extraction |
| `colour` | `text` | Optional | Primary stone colour |
| `finish` | `text` | Optional | Polished, Flamed, Honed, Leather, etc. |
| `thickness` | `numeric(8, 2)` | Check > 0 | Slab/tile thickness in mm |
| `length` | `numeric(8, 2)` | Check > 0 | Slab length in mm |
| `width` | `numeric(8, 2)` | Check > 0 | Slab width in mm |
| `minimum_order_quantity`| `numeric(12, 3)` | Check > 0 | Minimum order threshold |
| `unit` | `text` | Check: `'sq_ft' \| 'sq_m' \| 'piece' \| 'ton' \| 'metric_ton' \| 'slab' \| 'box' \| 'custom'` | Sale measurement unit |
| `price_type` | `text` | Check: `'fixed' \| 'on_request' \| 'range'` | Pricing structure |
| `price` | `numeric(14, 2)` | Check >= 0 | Base price per unit (INR) |
| `price_max` | `numeric(14, 2)` | Check >= price | Ceiling price for range model |
| `currency` | `text` | Default `'INR'` | ISO 4217 currency code |
| `stock_status` | `text` | Default `'in_stock'`, check: `'in_stock' \| 'out_of_stock' \| 'made_to_order' \| 'discontinued'` | Availability |
| `lead_time` | `text` | Optional | Production / Delivery lead time |
| `moderation_status` | `text` | Default `'draft'`, check: `'draft' \| 'pending_review' \| 'approved' \| 'rejected' \| 'archived'` | Admin moderation status |
| `rejection_reason` | `text` | Optional | Feedback if rejected |
| `published_at` | `timestamptz` | Optional | Live timestamp |
| `search_vector` | `tsvector` | Generated always as `to_tsvector(...)` | GIN-indexed full-text search vector |
| `created_at` | `timestamptz` | Default `now()` | Timestamp |
| `updated_at` | `timestamptz` | Default `now()` | Timestamp |

- **Automatic Re-Review**: Editing an approved product automatically resets `moderation_status` to `'pending_review'` to prevent unauthorized alterations to live catalog listings.

### 8. `product_images`
Product imagery gallery with primary image partial uniqueness.

| Column | Type | Constraints / Default | Description |
| ------ | ---- | --------------------- | ----------- |
| `id` | `uuid` | PK | Image ID |
| `product_id` | `uuid` | References `products(id)` ON DELETE CASCADE | Associated product |
| `storage_path` | `text` | Enforced `<seller_id>/<product_id>/...` | Public bucket object key |
| `alt_text` | `text` | Optional | Accessibility / SEO text |
| `is_primary` | `boolean` | Default `false` | Main listing image flag |
| `display_order` | `integer` | Default `0` | Carousel position |
| `created_at` | `timestamptz` | Default `now()` | Timestamp |

- **Constraint**: Partial unique index on `(product_id) WHERE is_primary = true` guarantees at most one primary image per product.

### 9. `product_specifications`
Key-value technical characteristics (density, water absorption, compressive strength, etc.).

| Column | Type | Constraints / Default | Description |
| ------ | ---- | --------------------- | ----------- |
| `id` | `uuid` | PK | Spec ID |
| `product_id` | `uuid` | References `products(id)` ON DELETE CASCADE | Associated product |
| `specification_name` | `text` | Check 1..100 chars | Property name |
| `specification_value`| `text` | Check 1..500 chars | Property value |
| `display_order` | `integer` | Default `0` | Sort order |

### 10. `product_favourites`
Saved products for registered buyers.

| Column | Type | Constraints / Default | Description |
| ------ | ---- | --------------------- | ----------- |
| `id` | `uuid` | PK | Favourite ID |
| `buyer_id` | `uuid` | References `profiles(id)` ON DELETE CASCADE | Owning buyer |
| `product_id` | `uuid` | References `products(id)` ON DELETE CASCADE | Target product |
| `created_at` | `timestamptz` | Default `now()` | Timestamp |

- **Constraint**: UNIQUE on `(buyer_id, product_id)`.
- **RLS Guard**: Buyers can only favourite products that are currently approved and published.

### 11. `enquiries`
B2B Request for Quotation (RFQ) and initial customer lead pipeline.

| Column | Type | Constraints / Default | Description |
| ------ | ---- | --------------------- | ----------- |
| `id` | `uuid` | PK | Enquiry ID |
| `buyer_id` | `uuid` | References `profiles(id)` ON DELETE RESTRICT | Inquiring buyer |
| `seller_id` | `uuid` | References `seller_profiles(id)` ON DELETE RESTRICT | Target supplier |
| `product_id` | `uuid` | References `products(id)` ON DELETE RESTRICT | Optional product reference |
| `enquiry_title` | `text` | Check 3..200 chars | Subject line |
| `description` | `text` | Check 1..5000 chars | Order specifications & requirements |
| `quantity` | `numeric(14, 3)` | Check > 0 | Volume required |
| `unit` | `text` | Measurement unit | Matching catalog units |
| `expected_budget` | `numeric(14, 2)` | Optional, >= 0 | Buyer's budget estimate |
| `currency` | `text` | Default `'INR'` | Currency code |
| `delivery_location` | `text` | Optional | Site / Destination city |
| `required_delivery_date` | `date` | Optional | Desired timeline |
| `status` | `text` | Default `'submitted'`, check: `'submitted' \| 'viewed' \| 'responding' \| 'quoted' \| 'accepted' \| 'rejected' \| 'closed' \| 'cancelled'` | State machine state |
| `client_request_id` | `uuid` | Optional idempotency key | Prevents double-submission on network retries |
| `created_at` | `timestamptz` | Default `now()` | Timestamp |
| `updated_at` | `timestamptz` | Default `now()` | Timestamp |

- **Idempotency**: Unique constraint on `(buyer_id, client_request_id)` ensures retry safety.
- **State Machine**: Direct client updates to status are disabled; transitions are strictly governed by `public.transition_enquiry_status()`.

### 12. `enquiry_status_history`
Append-only tamper-evident audit log of all enquiry lifecycle stages.

| Column | Type | Constraints / Default | Description |
| ------ | ---- | --------------------- | ----------- |
| `id` | `uuid` | PK | History ID |
| `enquiry_id` | `uuid` | References `enquiries(id)` ON DELETE RESTRICT | Enquiry |
| `previous_status` | `text` | Optional | Preceding status |
| `new_status` | `text` | Mandatory | Target status |
| `changed_by` | `uuid` | References `profiles(id)` | Acting user |
| `notes` | `text` | Optional | Reason / Transition remark |
| `created_at` | `timestamptz` | Default `now()` | Timestamp |

### 13. `quotations` & `quotation_items`
Commercial offers generated by sellers in response to buyer enquiries.

| Column | Type | Constraints / Default | Description |
| ------ | ---- | --------------------- | ----------- |
| `id` | `uuid` | PK | Quotation ID |
| `enquiry_id` | `uuid` | References `enquiries(id)` ON DELETE RESTRICT | Parent enquiry |
| `seller_id` | `uuid` | References `seller_profiles(id)` ON DELETE RESTRICT | Issuing seller |
| `buyer_id` | `uuid` | References `profiles(id)` ON DELETE RESTRICT | Recipient buyer |
| `quote_number` | `text` | UNIQUE, generated via `quotation_number_seq` | `QT-YYYY-000001` format |
| `subtotal` | `numeric(14, 2)` | Check >= 0 | Item sum |
| `tax_amount` | `numeric(14, 2)` | Default 0, >= 0 | GST / VAT |
| `shipping_charges` | `numeric(14, 2)` | Default 0, >= 0 | Freight / Loading cost |
| `discount_amount` | `numeric(14, 2)` | Default 0, <= subtotal | Promotional discount |
| `total_amount` | `numeric(14, 2)` | Check >= 0 | Final payable sum |
| `currency` | `text` | Default `'INR'` | Currency |
| `valid_until` | `timestamptz` | Optional | Expiration deadline |
| `terms` | `text` | Optional | Payment and freight terms |
| `status` | `text` | Default `'draft'`, check: `'draft' \| 'sent' \| 'viewed' \| 'accepted' \| 'rejected' \| 'expired' \| 'revised' \| 'cancelled'` | Quotation state |
| `created_at` | `timestamptz` | Default `now()` | Timestamp |
| `updated_at` | `timestamptz` | Default `now()` | Timestamp |

- **Formula Integrity**: `check (total_amount = subtotal - discount_amount + tax_amount + shipping_charges)`.
- **Send Guard**: Trigger ensures `status` can only become `'sent'` if quotation items exist and their sum exactly equals `subtotal`.

### 14. `notifications`
Real-time user notification store with private read and acknowledge capabilities.

| Column | Type | Constraints / Default | Description |
| ------ | ---- | --------------------- | ----------- |
| `id` | `uuid` | PK | Notification ID |
| `user_id` | `uuid` | References `profiles(id)` ON DELETE CASCADE | Target user |
| `title` | `text` | Check 1..200 chars | Notification title |
| `message` | `text` | Check <= 2000 chars | Notification body |
| `notification_type` | `text` | Check enum: `'enquiry_received'`, `'quotation_received'`, `'seller_verification'`, etc. | Categorization |
| `reference_id` | `uuid` | Optional | Linked entity ID |
| `is_read` | `boolean` | Default `false` | Read receipt |
| `created_at` | `timestamptz` | Default `now()` | Timestamp |

### 15. `admin_audit_logs`
Immutable compliance and moderation ledger.

| Column | Type | Constraints / Default | Description |
| ------ | ---- | --------------------- | ----------- |
| `id` | `uuid` | PK | Audit log ID |
| `admin_id` | `uuid` | References `profiles(id)` | Acting administrator |
| `action` | `text` | Mandatory | Action descriptor |
| `entity_type` | `text` | Mandatory | Modified table/resource |
| `entity_id` | `text` | Optional | Target primary key |
| `old_value` | `jsonb` | Optional | Pre-mutation snapshot |
| `new_value` | `jsonb` | Optional | Post-mutation snapshot |
| `ip_address` | `text` | Optional | Request IP |
| `user_agent` | `text` | Optional | User agent string |
| `created_at` | `timestamptz` | Default `now()` | Timestamp |
