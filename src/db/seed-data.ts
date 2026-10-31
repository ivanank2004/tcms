export interface SeedStep {
  stepNumber: number;
  instruction: string;
  expectedResult?: string;
}

export interface SeedTestCase {
  key: string; // e.g. "SHOP-001"
  sequenceNumber: number;
  moduleName: string;
  title: string;
  description: string;
  preconditions: string;
  expectedResult: string;
  priority: "critical" | "high" | "medium" | "low";
  lifecycle: "draft" | "ready" | "deprecated";
  testTypes: string[];
  tags: string[];
  steps: SeedStep[];
  // If revision 2 is needed to demonstrate snapshot immutability
  rev2?: {
    title: string;
    description?: string;
    preconditions?: string;
    expectedResult?: string;
    steps: SeedStep[];
    changeSummary: string;
  };
}

export interface SeedModule {
  name: string;
  description: string;
  parentName?: string;
}

export interface SeedPlan {
  name: string;
  description: string;
  scopeNotes: string;
  targetRelease: string;
  environment: string;
  status: "draft" | "active" | "completed" | "archived";
  caseKeys: string[];
}

export interface SeedRunCaseAttempt {
  attemptNumber: number;
  status: "passed" | "failed" | "blocked" | "skipped";
  actualResult: string;
  durationSeconds: number;
}

export interface SeedRunCase {
  caseKey: string;
  useRev1SnapshotEvenIfCaseHasRev2?: boolean;
  status: "not_run" | "passed" | "failed" | "blocked" | "skipped";
  attempts?: SeedRunCaseAttempt[];
}

export interface SeedRun {
  name: string;
  planName?: string;
  environment: string;
  buildVersion: string;
  status: "not_started" | "in_progress" | "completed" | "aborted";
  notes: string;
  cases: SeedRunCase[];
}

export interface SeedProject {
  name: string;
  key: string;
  description: string;
  modules: SeedModule[];
  testCases: SeedTestCase[];
  plans: SeedPlan[];
  runs: SeedRun[];
}

export const SEED_PROJECTS: SeedProject[] = [
  // --------------------------------------------------------------------------
  // PROJECT 1: Commerce Portal (SHOP)
  // --------------------------------------------------------------------------
  {
    name: "Commerce Portal",
    key: "SHOP",
    description: "Modern e-commerce platform with catalog, cart, payments, and order fulfillment services.",
    modules: [
      { name: "Authentication & Security", description: "Customer login, registration, MFA, and OAuth token management." },
      { name: "Product Catalog", description: "Merchandising catalog, category browsing, and inventory status." },
      { name: "Search & Faceted Filters", description: "Elastic search indices, price/brand filtering, and sorting.", parentName: "Product Catalog" },
      { name: "Shopping Cart & Discounts", description: "Cart calculation, voucher promotions, and tax engine." },
      { name: "Checkout & Payments", description: "Multi-step checkout flow, address validation, and payment settlement." },
      { name: "Payment Gateway 3DS", description: "PCI-DSS tokenized card processing with 3DS 2.2 authentication.", parentName: "Checkout & Payments" },
      { name: "Order Fulfillment", description: "Invoice generation, warehouse dispatch notification, and tracking." }
    ],
    plans: [
      {
        name: "Release 2.4.0 Sanity Suite",
        description: "Core verification of checkout pipeline, payment integration, and customer order fulfillment.",
        scopeNotes: "Covers high and critical priority cases across Catalog, Cart, and Checkout.",
        targetRelease: "v2.4.0",
        environment: "staging",
        status: "active",
        caseKeys: ["SHOP-001", "SHOP-002", "SHOP-003", "SHOP-004", "SHOP-005", "SHOP-006", "SHOP-007", "SHOP-008"]
      },
      {
        name: "Payment Gateway Security & Compliance Audit",
        description: "Audit test plan validating 3D-Secure 2.2 step-up verification, CVV checks, and token expiry handling.",
        scopeNotes: "Strictly focused on Payment Gateway 3DS and card compliance scenarios.",
        targetRelease: "v2.4.1",
        environment: "uat",
        status: "completed",
        caseKeys: ["SHOP-001", "SHOP-002", "SHOP-006", "SHOP-015"]
      },
      {
        name: "Black Friday Load & High-Volume Preparation",
        description: "Stress scenario planning for promotional voucher stacking, fast checkout, and inventory locking.",
        scopeNotes: "Covers cart concurrency, promo codes, and order placement under load.",
        targetRelease: "v2.5.0",
        environment: "perf-lab",
        status: "draft",
        caseKeys: ["SHOP-003", "SHOP-004", "SHOP-005", "SHOP-008", "SHOP-012"]
      }
    ],
    runs: [
      {
        name: "Sprint 48 Regression Run",
        planName: "Release 2.4.0 Sanity Suite",
        environment: "staging",
        buildVersion: "build-2026.10.48",
        status: "in_progress",
        notes: "Automated + manual hybrid regression pass for Sprint 48 release candidate.",
        cases: [
          {
            caseKey: "SHOP-001",
            status: "passed",
            attempts: [
              {
                attemptNumber: 1,
                status: "failed",
                actualResult: "SMS OTP modal timed out after 30 seconds due to latency in sandbox SMS gateway.",
                durationSeconds: 42
              },
              {
                attemptNumber: 2,
                status: "passed",
                actualResult: "Retested with sandbox bypass code 000000. 3DS verified and payment token generated successfully.",
                durationSeconds: 18
              }
            ]
          },
          {
            caseKey: "SHOP-002",
            useRev1SnapshotEvenIfCaseHasRev2: true, // Demonstrates snapshot immutability
            status: "passed",
            attempts: [
              {
                attemptNumber: 1,
                status: "passed",
                actualResult: "Expired card correctly rejected with user-friendly message 'Card has expired'.",
                durationSeconds: 15
              }
            ]
          },
          {
            caseKey: "SHOP-003",
            status: "passed",
            attempts: [
              {
                attemptNumber: 1,
                status: "passed",
                actualResult: "15% discount voucher subtracted correctly from cart subtotal.",
                durationSeconds: 22
              }
            ]
          },
          {
            caseKey: "SHOP-004",
            status: "failed",
            attempts: [
              {
                attemptNumber: 1,
                status: "failed",
                actualResult: "BUG: System allowed combining coupon 'SAVE10' with exclusive VIP voucher 'VIP20'.",
                durationSeconds: 31
              }
            ]
          },
          {
            caseKey: "SHOP-005",
            status: "blocked",
            attempts: [
              {
                attemptNumber: 1,
                status: "blocked",
                actualResult: "Blocked: Redis cart session cache cluster was undergoing maintenance during execution.",
                durationSeconds: 5
              }
            ]
          },
          {
            caseKey: "SHOP-006",
            status: "skipped",
            attempts: [
              {
                attemptNumber: 1,
                status: "skipped",
                actualResult: "Skipped: Feature flag for multi-currency settlement was toggled off on staging.",
                durationSeconds: 0
              }
            ]
          },
          {
            caseKey: "SHOP-007",
            status: "not_run"
          },
          {
            caseKey: "SHOP-008",
            status: "not_run"
          }
        ]
      },
      {
        name: "PCI-DSS Compliance Run",
        planName: "Payment Gateway Security & Compliance Audit",
        environment: "uat",
        buildVersion: "build-2026.10.45-audit",
        status: "completed",
        notes: "Full audit certification for PCI-DSS 4.0 cardholder data environment.",
        cases: [
          {
            caseKey: "SHOP-001",
            status: "passed",
            attempts: [
              {
                attemptNumber: 1,
                status: "passed",
                actualResult: "Full challenge flow verified without storing raw CVV/PAN in local storage.",
                durationSeconds: 25
              }
            ]
          },
          {
            caseKey: "SHOP-002",
            useRev1SnapshotEvenIfCaseHasRev2: true,
            status: "passed",
            attempts: [
              {
                attemptNumber: 1,
                status: "passed",
                actualResult: "Expired card declined cleanly.",
                durationSeconds: 12
              }
            ]
          },
          {
            caseKey: "SHOP-006",
            status: "passed",
            attempts: [
              {
                attemptNumber: 1,
                status: "passed",
                actualResult: "Tokenization proxy confirmed non-reversible hash generated.",
                durationSeconds: 19
              }
            ]
          },
          {
            caseKey: "SHOP-015",
            status: "passed",
            attempts: [
              {
                attemptNumber: 1,
                status: "passed",
                actualResult: "Idempotency key prevents duplicate charges on network retry.",
                durationSeconds: 28
              }
            ]
          }
        ]
      }
    ],
    testCases: [
      {
        key: "SHOP-001",
        sequenceNumber: 1,
        moduleName: "Payment Gateway 3DS",
        title: "Authorize Card via 3D-Secure 2.2 with SMS OTP Challenge",
        description: "Verify that payments requiring strong customer authentication trigger the 3DS 2.2 challenge window.",
        preconditions: "User has a cart containing > $50 worth of merchandise and enters a test card flagged for 3DS challenge.",
        expectedResult: "Bank challenge modal pops up, accepts OTP 000000, and returns 200 OK authorization token.",
        priority: "critical",
        lifecycle: "ready",
        testTypes: ["security", "integration", "positive"],
        tags: ["smoke", "checkout", "3ds", "payments"],
        steps: [
          { stepNumber: 1, instruction: "Navigate to Checkout step 3 (Payment Method).", expectedResult: "Payment method options displayed." },
          { stepNumber: 2, instruction: "Select 'Credit Card' and input 3DS-enrolled card number 4000 0012 3456 7890.", expectedResult: "Card recognized as Visa with 3DS requirement." },
          { stepNumber: 3, instruction: "Click 'Pay Now' to initiate transaction.", expectedResult: "3DS challenge iframe/modal appears with SMS OTP input." },
          { stepNumber: 4, instruction: "Enter verification code '000000' and submit.", expectedResult: "Challenge completes, order confirmation page displays." }
        ]
      },
      {
        key: "SHOP-002",
        sequenceNumber: 2,
        moduleName: "Payment Gateway 3DS",
        title: "Decline Expired Credit Card with Friendly Validation Message",
        description: "Ensure cards with expiration month/year in the past are rejected client-side and server-side.",
        preconditions: "User on payment screen with valid cart subtotal.",
        expectedResult: "Inline error 'Your card has expired' appears without charging customer.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["negative", "validation"],
        tags: ["checkout", "payments", "validation"],
        steps: [
          { stepNumber: 1, instruction: "Enter card details with expiration date 01/22.", expectedResult: "Expiration date field highlights with validation error." },
          { stepNumber: 2, instruction: "Attempt to submit payment form.", expectedResult: "Submission blocked; error message advises updating expiration." }
        ],
        // Revision 2 example demonstrating revision history and snapshot immutability
        rev2: {
          title: "Decline Expired Credit Card & Suggest Saved Card Alternative",
          description: "Updated specification: When expired card is entered, check if user has valid saved payment methods.",
          preconditions: "User authenticated with at least one active saved card on profile.",
          expectedResult: "Inline error displayed and quick-switch button to saved card is presented.",
          changeSummary: "Added saved card recommendation workflow to reduce checkout abandonment.",
          steps: [
            { stepNumber: 1, instruction: "Enter card details with expiration date in past.", expectedResult: "Expiration field flags error." },
            { stepNumber: 2, instruction: "Inspect fallback options on UI.", expectedResult: "List of valid saved cards suggested below input." },
            { stepNumber: 3, instruction: "Select saved card and confirm checkout.", expectedResult: "Order processed successfully." }
          ]
        }
      },
      {
        key: "SHOP-003",
        sequenceNumber: 3,
        moduleName: "Shopping Cart & Discounts",
        title: "Apply Percentage Discount Voucher to Eligible Cart Subtotal",
        description: "Verify promo voucher applying 15% discount recalculates tax, subtotal, and total accurately.",
        preconditions: "Voucher code 'SPRING15' exists in database with 15% discount value.",
        expectedResult: "Discount row added to summary table; total reduced by exactly 15% before tax.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["positive", "boundary_value"],
        tags: ["cart", "promotions", "discounts"],
        steps: [
          { stepNumber: 1, instruction: "Add items worth $100.00 to cart.", expectedResult: "Cart subtotal shows $100.00." },
          { stepNumber: 2, instruction: "Enter coupon code 'SPRING15' in promo field and click Apply.", expectedResult: "Success badge '15% Off Applied' appears." },
          { stepNumber: 3, instruction: "Verify cart total.", expectedResult: "Discount shows -$15.00, revised subtotal is $85.00." }
        ]
      },
      {
        key: "SHOP-004",
        sequenceNumber: 4,
        moduleName: "Shopping Cart & Discounts",
        title: "Prevent Stacking of Multiple Exclusive Promotional Vouchers",
        description: "Validate business rule that exclusive campaign vouchers cannot be combined.",
        preconditions: "Cart has active voucher 'SAVE10' applied.",
        expectedResult: "Applying second voucher 'VIP20' prompts user to replace rather than stack.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["negative", "edge_case", "validation"],
        tags: ["cart", "promotions", "edge-case"],
        steps: [
          { stepNumber: 1, instruction: "Apply 'SAVE10' to cart.", expectedResult: "Discount active." },
          { stepNumber: 2, instruction: "Input second code 'VIP20' and click Apply.", expectedResult: "Dialog: 'Only one promo code allowed. Replace SAVE10 with VIP20?'." },
          { stepNumber: 3, instruction: "Click 'Cancel' on replacement prompt.", expectedResult: "Original 'SAVE10' voucher remains intact." }
        ]
      },
      {
        key: "SHOP-005",
        sequenceNumber: 5,
        moduleName: "Shopping Cart & Discounts",
        title: "Cart Session Persistence Across Browser Refresh and Inactive Periods",
        description: "Ensure items placed in cart by authenticated user persist in database session.",
        preconditions: "User logged in with 3 items added to cart.",
        expectedResult: "Items remain present after hard refresh and across new browser sessions.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["regression", "positive"],
        tags: ["cart", "session", "persistence"],
        steps: [
          { stepNumber: 1, instruction: "Add 3 distinct items to cart.", expectedResult: "Cart badge shows 3 items." },
          { stepNumber: 2, instruction: "Close browser tab and re-open application.", expectedResult: "Cart icon maintains count 3." },
          { stepNumber: 3, instruction: "Open cart drawer.", expectedResult: "All 3 items match previous selected variants." }
        ]
      },
      {
        key: "SHOP-006",
        sequenceNumber: 6,
        moduleName: "Payment Gateway 3DS",
        title: "Payment Tokenization Anonymization in Audit Logs",
        description: "Verify that raw PAN, CVV, and customer billing secrets are never emitted in application logs.",
        preconditions: "Debug logging enabled in staging environment.",
        expectedResult: "Logs contain only tokenized reference (e.g. tok_visa_4242) and redacted digits (**** 4242).",
        priority: "critical",
        lifecycle: "ready",
        testTypes: ["security", "regression"],
        tags: ["security", "pci-dss", "audit"],
        steps: [
          { stepNumber: 1, instruction: "Submit payment transaction via API.", expectedResult: "Transaction completes." },
          { stepNumber: 2, instruction: "Inspect server application logs for request payload.", expectedResult: "Sensitive fields CVV and number masked with asterisks." }
        ]
      },
      {
        key: "SHOP-007",
        sequenceNumber: 7,
        moduleName: "Checkout & Payments",
        title: "Validate Shipping Address Form against Postal Standard API",
        description: "Ensure international addresses validate postal code and state format properly.",
        preconditions: "User on checkout shipping address step.",
        expectedResult: "Invalid postal code for selected country flags inline validation error.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["validation", "positive", "negative"],
        tags: ["checkout", "shipping", "address"],
        steps: [
          { stepNumber: 1, instruction: "Select Country: United States.", expectedResult: "State dropdown and ZIP code field displayed." },
          { stepNumber: 2, instruction: "Enter 3-digit ZIP '123'.", expectedResult: "Validation message: 'ZIP code must be 5 digits or ZIP+4'." },
          { stepNumber: 3, instruction: "Enter valid ZIP '94107'.", expectedResult: "City automatically populates 'San Francisco, CA'." }
        ]
      },
      {
        key: "SHOP-008",
        sequenceNumber: 8,
        moduleName: "Order Fulfillment",
        title: "Immediate Stock Reservation on Successful Payment Handshake",
        description: "Verify product inventory count decrements immediately upon order confirmation.",
        preconditions: "Product 'Mechanical Keyboard Pro' has inventory count = 5.",
        expectedResult: "Purchasing 2 units decreases database inventory to 3.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["integration", "positive"],
        tags: ["orders", "inventory", "stock"],
        steps: [
          { stepNumber: 1, instruction: "Verify product stock in database is 5 units.", expectedResult: "Stock = 5." },
          { stepNumber: 2, instruction: "Checkout with quantity = 2.", expectedResult: "Order confirmed with order ID." },
          { stepNumber: 3, instruction: "Query product inventory table.", expectedResult: "Available stock reflects 3 units." }
        ]
      },
      {
        key: "SHOP-009",
        sequenceNumber: 9,
        moduleName: "Product Catalog",
        title: "Product Detail Page Rendering with Variant Matrix",
        description: "Validate color and size selector updates SKU price and gallery image dynamically.",
        preconditions: "Product exists with Color (Black, White) and Size (M, L, XL) options.",
        expectedResult: "Selecting White + XL updates image URL and displays correct stock status.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["positive", "compatibility"],
        tags: ["catalog", "variants", "ui"],
        steps: [
          { stepNumber: 1, instruction: "Open product page /products/ergonomic-chair.", expectedResult: "Default variant selected." },
          { stepNumber: 2, instruction: "Click 'White' color swatch.", expectedResult: "Product primary image swaps to white model." },
          { stepNumber: 3, instruction: "Select size 'XL'.", expectedResult: "SKU label updates to CHAIR-WHT-XL." }
        ]
      },
      {
        key: "SHOP-010",
        sequenceNumber: 10,
        moduleName: "Search & Faceted Filters",
        title: "Faceted Search Multi-Select Filter Intersection",
        description: "Validate that selecting Category: Electronics AND Price: $50-$100 returns strict intersection.",
        preconditions: "Catalog seeded with products across categories and price bands.",
        expectedResult: "Result count matches items fulfilling BOTH criteria simultaneously.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["positive", "integration"],
        tags: ["search", "filters", "catalog"],
        steps: [
          { stepNumber: 1, instruction: "Filter by category 'Audio'.", expectedResult: "12 headphones and speakers shown." },
          { stepNumber: 2, instruction: "Enable price filter checkbox '$50 - $100'.", expectedResult: "Results narrow to 4 items in specified range." }
        ]
      },
      {
        key: "SHOP-011",
        sequenceNumber: 11,
        moduleName: "Authentication & Security",
        title: "Customer Password Reset Token Expiry and One-Time Use",
        description: "Verify that password reset link expires after 15 minutes and cannot be reused.",
        preconditions: "User requested password reset link.",
        expectedResult: "Second attempt to click reset link returns 400 'Link has expired or been used'.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["security", "negative"],
        tags: ["auth", "security", "tokens"],
        steps: [
          { stepNumber: 1, instruction: "Click password reset link from email.", expectedResult: "Reset password form loads." },
          { stepNumber: 2, instruction: "Submit new password 'StrongPass!2026'.", expectedResult: "Password updated successfully." },
          { stepNumber: 3, instruction: "Click identical link again in browser.", expectedResult: "Error message: 'Token is invalid or already consumed'." }
        ]
      },
      {
        key: "SHOP-012",
        sequenceNumber: 12,
        moduleName: "Shopping Cart & Discounts",
        title: "Cart Subtotal Boundary Rounding for Fractional Cent Taxes",
        description: "Ensure state tax calculations round up or down according to half-up accounting standards.",
        preconditions: "Tax rate set to 8.875% (New York).",
        expectedResult: "Calculated tax matches precision financial rounding to 2 decimal places.",
        priority: "low",
        lifecycle: "ready",
        testTypes: ["boundary_value", "validation"],
        tags: ["cart", "tax", "rounding"],
        steps: [
          { stepNumber: 1, instruction: "Add item priced at $19.99 to cart.", expectedResult: "Subtotal is $19.99." },
          { stepNumber: 2, instruction: "Apply NY tax rate 8.875%.", expectedResult: "Tax calculated as $1.77 (1.7741 rounded to 1.77)." }
        ]
      },
      {
        key: "SHOP-013",
        sequenceNumber: 13,
        moduleName: "Order Fulfillment",
        title: "Webhook Dispatch on Warehouse Tracking Number Assignment",
        description: "Verify order status transitions to 'shipped' when fulfillment webhook delivers tracking carrier info.",
        preconditions: "Order in status 'processing'.",
        expectedResult: "Order status changes to 'shipped' and customer email notification is enqueued.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["integration", "positive"],
        tags: ["orders", "fulfillment", "webhooks"],
        steps: [
          { stepNumber: 1, instruction: "Dispatch POST /api/v1/fulfillment/webhook with valid payload and signature.", expectedResult: "Webhook returns 200 Accepted." },
          { stepNumber: 2, instruction: "Query order record in database.", expectedResult: "Status = 'shipped' and carrierTracking = 'TRK-981247'." }
        ]
      },
      {
        key: "SHOP-014",
        sequenceNumber: 14,
        moduleName: "Product Catalog",
        title: "Out-of-Stock Badge and Disable Add-to-Cart Button",
        description: "Verify that inventory zero displays clear out of stock label and prevents order placement.",
        preconditions: "Product 'Vintage Leather Bag' has inventory = 0.",
        expectedResult: "Button disabled with text 'Out of Stock' and 'Notify Me When Available' form displayed.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["positive", "boundary_value"],
        tags: ["catalog", "inventory", "ui"],
        steps: [
          { stepNumber: 1, instruction: "Visit product detail page for zero-stock SKU.", expectedResult: "'Out of Stock' banner visible." },
          { stepNumber: 2, instruction: "Attempt to click Add to Cart button.", expectedResult: "Button is disabled (pointer-events none)." }
        ]
      },
      {
        key: "SHOP-015",
        sequenceNumber: 15,
        moduleName: "Checkout & Payments",
        title: "Idempotent Payment Request Handling on Network Retries",
        description: "Ensure that repeating payment submission with identical Idempotency-Key does not double-charge.",
        preconditions: "Client payment form generates UUID idempotency key per checkout attempt.",
        expectedResult: "Second POST request returns cached 200 authorization response without calling payment gateway twice.",
        priority: "critical",
        lifecycle: "ready",
        testTypes: ["security", "error_handling", "boundary_value"],
        tags: ["checkout", "payments", "idempotency"],
        steps: [
          { stepNumber: 1, instruction: "Send payment request with Idempotency-Key: idemp-9817.", expectedResult: "Payment authorized for $75.00." },
          { stepNumber: 2, instruction: "Re-send duplicate request with identical Idempotency-Key within 5 seconds.", expectedResult: "Returns identical authorization result without secondary gateway charge." }
        ]
      },
      {
        key: "SHOP-016",
        sequenceNumber: 16,
        moduleName: "Authentication & Security",
        title: "OAuth2 Google Single Sign-On Account Linking",
        description: "Verify customer can link existing email/password account with Google SSO profile.",
        preconditions: "Account exists with email 'developer@example.com'.",
        expectedResult: "Google profile with matching verified email links seamlessly without account duplication.",
        priority: "medium",
        lifecycle: "draft",
        testTypes: ["integration", "positive"],
        tags: ["auth", "oauth", "sso"],
        steps: [
          { stepNumber: 1, instruction: "Click 'Sign in with Google' on login page.", expectedResult: "Redirects to Google consent screen." },
          { stepNumber: 2, instruction: "Authorize with verified email 'developer@example.com'.", expectedResult: "Account recognized; links googleId and redirects to dashboard." }
        ]
      },
      {
        key: "SHOP-017",
        sequenceNumber: 17,
        moduleName: "Search & Faceted Filters",
        title: "Handle Special Characters and SQL Injection in Catalog Search",
        description: "Verify that searching with quotes, semicolons, and wildcards executes sanitized queries.",
        preconditions: "User on search bar.",
        expectedResult: "Search executes safely, treats input as literal search string, and does not return 500 error.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["security", "negative", "edge_case"],
        tags: ["search", "security", "sanitization"],
        steps: [
          { stepNumber: 1, instruction: "Enter search query: ' OR '1'='1' --", expectedResult: "Query sanitized; returns 0 matches or literal match." },
          { stepNumber: 2, instruction: "Enter search query: <script>alert(1)</script>", expectedResult: "HTML entities escaped in 'Results for ...' display." }
        ]
      },
      {
        key: "SHOP-018",
        sequenceNumber: 18,
        moduleName: "Order Fulfillment",
        title: "Order Cancellation Window within 30 Minutes of Placement",
        description: "Validate customer can self-cancel order prior to warehouse picking stage.",
        preconditions: "Order placed 10 minutes ago, status is 'placed'.",
        expectedResult: "Cancel button active; clicking initiates full refund and updates status to 'cancelled'.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["positive", "state_transition"],
        tags: ["orders", "cancellation", "refunds"],
        steps: [
          { stepNumber: 1, instruction: "Open Order Details page /orders/ORD-4102.", expectedResult: "'Cancel Order' button visible." },
          { stepNumber: 2, instruction: "Click 'Cancel Order' and select reason 'Accidental duplicate'.", expectedResult: "Confirmation modal appears." },
          { stepNumber: 3, instruction: "Confirm cancellation.", expectedResult: "Status changes to 'cancelled'; refund transaction recorded." }
        ]
      },
      {
        key: "SHOP-019",
        sequenceNumber: 19,
        moduleName: "Authentication & Security",
        title: "Enforce MFA Verification for Accounts with Admin Roles",
        description: "Verify administrative customer profiles require TOTP authenticator code on login.",
        preconditions: "User has role 'admin' and registered authenticator app.",
        expectedResult: "Password prompt followed by TOTP code prompt; access denied without valid 6-digit code.",
        priority: "critical",
        lifecycle: "ready",
        testTypes: ["security", "positive"],
        tags: ["auth", "mfa", "security"],
        steps: [
          { stepNumber: 1, instruction: "Submit email and password for admin account.", expectedResult: "Step 2 modal requests 6-digit authenticator code." },
          { stepNumber: 2, instruction: "Enter valid TOTP code from authenticator app.", expectedResult: "Authenticated session established." }
        ]
      },
      {
        key: "SHOP-020",
        sequenceNumber: 20,
        moduleName: "Shopping Cart & Discounts",
        title: "Legacy Cookie Cart Migration to User Profile [DEPRECATED]",
        description: "Deprecated spec: Synchronizing old V1 cookie-based carts into V2 account database.",
        preconditions: "Client has legacy v1 cart cookie stored in browser.",
        expectedResult: "Migration script runs on login.",
        priority: "low",
        lifecycle: "deprecated",
        testTypes: ["regression"],
        tags: ["cart", "migration", "legacy"],
        steps: [
          { stepNumber: 1, instruction: "Inspect legacy cart migration endpoint.", expectedResult: "Returns 410 Gone with modern API directive." }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // PROJECT 2: Learning Management System (LEARN)
  // --------------------------------------------------------------------------
  {
    name: "Learning Management System",
    key: "LEARN",
    description: "Enterprise e-learning and corporate training portal with course authoring, progress tracking, and grading.",
    modules: [
      { name: "Authentication & RBAC", description: "Role-based access control for Students, Instructors, and Administrators." },
      { name: "Course Management", description: "Curriculum builder, lesson syllabus, and publishing states." },
      { name: "Lesson Multimedia", description: "Video player, PDF attachments, and SCORM interactive modules.", parentName: "Course Management" },
      { name: "Enrollment Engine", description: "Cohort assignments, seat licenses, and automated enrollment rules." },
      { name: "Learning Progress Tracker", description: "Completion percentages, timestamp tracking, and streak counters." },
      { name: "Assessment & Quiz Grading", description: "Timed quizzes, multiple choice questions, and gradebook calculation." }
    ],
    plans: [
      {
        name: "Q4 Platform Release Plan",
        description: "End-to-end certification of LMS core workflows: enrollment, progress checkpoints, and quiz submissions.",
        scopeNotes: "Covers all ready test cases across Student and Instructor roles.",
        targetRelease: "v4.1.0",
        environment: "staging",
        status: "active",
        caseKeys: ["LEARN-001", "LEARN-002", "LEARN-003", "LEARN-004", "LEARN-005", "LEARN-006", "LEARN-007", "LEARN-008"]
      },
      {
        name: "SCORM Interactive Multimedia Verification",
        description: "Verification of third-party SCORM 1.2 and 2004 interactive package communication.",
        scopeNotes: "Focuses on Lesson Multimedia and Progress Tracker integrations.",
        targetRelease: "v4.2.0",
        environment: "uat",
        status: "draft",
        caseKeys: ["LEARN-003", "LEARN-009", "LEARN-010", "LEARN-014"]
      }
    ],
    runs: [
      {
        name: "Staging Smoke Run",
        planName: "Q4 Platform Release Plan",
        environment: "staging",
        buildVersion: "build-learn-4.1.2",
        status: "completed",
        notes: "Automated smoke validation for deployment sprint.",
        cases: [
          {
            caseKey: "LEARN-001",
            status: "passed",
            attempts: [
              {
                attemptNumber: 1,
                status: "passed",
                actualResult: "Student enrolled instantly and received onboarding welcome notification.",
                durationSeconds: 14
              }
            ]
          },
          {
            caseKey: "LEARN-002",
            status: "passed",
            attempts: [
              {
                attemptNumber: 1,
                status: "passed",
                actualResult: "Instructor access to self-grade blocked by RBAC permission rule.",
                durationSeconds: 9
              }
            ]
          },
          {
            caseKey: "LEARN-003",
            status: "passed",
            attempts: [
              {
                attemptNumber: 1,
                status: "passed",
                actualResult: "SCORM completion event triggered progress increment.",
                durationSeconds: 34
              }
            ]
          },
          {
            caseKey: "LEARN-004",
            status: "blocked",
            attempts: [
              {
                attemptNumber: 1,
                status: "blocked",
                actualResult: "Blocked: WebSockets quiz server connection unreachable on port 8089 in staging.",
                durationSeconds: 6
              }
            ]
          },
          {
            caseKey: "LEARN-005",
            status: "passed",
            attempts: [
              {
                attemptNumber: 1,
                status: "passed",
                actualResult: "Course draft published successfully to catalog.",
                durationSeconds: 19
              }
            ]
          }
        ]
      }
    ],
    testCases: [
      {
        key: "LEARN-001",
        sequenceNumber: 1,
        moduleName: "Enrollment Engine",
        title: "Student Self-Enrollment into Free Introductory Course",
        description: "Verify that authenticated student can self-enroll into free courses without payment.",
        preconditions: "Student logged in; Course 'Introduction to TypeScript' marked as Free.",
        expectedResult: "Enrollment record created with status 'active'; student redirected to first lesson.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["positive", "integration"],
        tags: ["enrollment", "smoke", "student"],
        steps: [
          { stepNumber: 1, instruction: "Open Course landing page /courses/intro-typescript.", expectedResult: "'Enroll Now for Free' button visible." },
          { stepNumber: 2, instruction: "Click 'Enroll Now for Free'.", expectedResult: "Success message displays; course added to 'My Learning' dashboard." },
          { stepNumber: 3, instruction: "Click 'Start Lesson 1'.", expectedResult: "Video player loads lesson 1." }
        ]
      },
      {
        key: "LEARN-002",
        sequenceNumber: 2,
        moduleName: "Authentication & RBAC",
        title: "Prevent Instructor Self-Grading on Assigned Evaluation Quizzes",
        description: "Enforce separation of duties: Instructors cannot submit grades for their own enrolled exams.",
        preconditions: "User logged in with role 'instructor' enrolled as a student in peer course.",
        expectedResult: "Gradebook actions disabled; warning banner indicates conflict of interest policy.",
        priority: "critical",
        lifecycle: "ready",
        testTypes: ["security", "negative", "permission_security"],
        tags: ["rbac", "security", "instructor"],
        steps: [
          { stepNumber: 1, instruction: "Navigate to Gradebook for course #401.", expectedResult: "Student grade rows listed." },
          { stepNumber: 2, instruction: "Attempt to update score for own student record.", expectedResult: "Input field disabled; error badge 'Cannot grade own submission'." }
        ]
      },
      {
        key: "LEARN-003",
        sequenceNumber: 3,
        moduleName: "Learning Progress Tracker",
        title: "Automatic Progress Checkmark on SCORM Package Completion",
        description: "Verify SCORM API 'cmi.core.lesson_status' set to 'completed' updates lesson status.",
        preconditions: "Student active on SCORM interactive module lesson.",
        expectedResult: "Lesson marked complete in sidebar navigation and course progress bar advances.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["integration", "positive"],
        tags: ["scorm", "progress", "tracking"],
        steps: [
          { stepNumber: 1, instruction: "Complete final slide in SCORM interactive module.", expectedResult: "SCORM player emits Commit() event." },
          { stepNumber: 2, instruction: "Inspect lesson list sidebar.", expectedResult: "Green checkmark appears next to Lesson 4." }
        ]
      },
      {
        key: "LEARN-004",
        sequenceNumber: 4,
        moduleName: "Assessment & Quiz Grading",
        title: "Timed Quiz Auto-Submission upon Clock Expiration",
        description: "Ensure active quiz session submits automatically when countdown timer reaches 00:00.",
        preconditions: "Quiz configured with 10-minute time limit; student has answered 7 of 10 questions.",
        expectedResult: "Form locks, unanswered questions scored as 0, and result calculates immediately.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["boundary_value", "positive"],
        tags: ["quiz", "timer", "assessment"],
        steps: [
          { stepNumber: 1, instruction: "Start timed quiz with 1 minute remaining.", expectedResult: "Timer counts down in sticky header." },
          { stepNumber: 2, instruction: "Allow timer to expire without clicking submit.", expectedResult: "Modal alert 'Time has expired. Submitting answers...'." },
          { stepNumber: 3, instruction: "Verify submission results.", expectedResult: "Quiz results page displays score for submitted answers." }
        ]
      },
      {
        key: "LEARN-005",
        sequenceNumber: 5,
        moduleName: "Course Management",
        title: "Course Syllabus Draft Publishing Workflow",
        description: "Verify transition of course state from 'draft' to 'published' requires required fields.",
        preconditions: "Instructor created new draft course with title, description, and at least 1 module.",
        expectedResult: "Publish button transitions course to published and lists it in public catalog.",
        priority: "low",
        lifecycle: "ready",
        testTypes: ["positive", "state_transition"],
        tags: ["course", "publishing", "workflow"],
        steps: [
          { stepNumber: 1, instruction: "Open Course Editor for draft course.", expectedResult: "Draft badge visible." },
          { stepNumber: 2, instruction: "Click 'Publish Course' button.", expectedResult: "Confirmation modal checks curriculum requirements." },
          { stepNumber: 3, instruction: "Confirm publication.", expectedResult: "Status badge updates to 'Published'." }
        ]
      },
      {
        key: "LEARN-006",
        sequenceNumber: 6,
        moduleName: "Enrollment Engine",
        title: "Seat License Depletion Prevents Over-Enrollment in Corporate Cohort",
        description: "Validate that cohorts with 50 purchased seats reject the 51st self-enrollment attempt.",
        preconditions: "Corporate cohort 'Engineering Q4' has 50 allocated seats, 50 currently filled.",
        expectedResult: "User notified 'Cohort has reached maximum capacity; contact your administrator'.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["boundary_value", "negative"],
        tags: ["enrollment", "seats", "limits"],
        steps: [
          { stepNumber: 1, instruction: "Attempt to join full cohort with invite token.", expectedResult: "Error dialog: 'Capacity limit reached (50/50)'." }
        ]
      },
      {
        key: "LEARN-007",
        sequenceNumber: 7,
        moduleName: "Assessment & Quiz Grading",
        title: "Multiple Choice Question Partial Credit Calculation",
        description: "Verify questions configured with multiple correct answers calculate proportional points.",
        preconditions: "Question worth 4 points has 4 checkboxes (2 correct, 2 incorrect).",
        expectedResult: "Selecting 1 correct checkbox and 0 incorrect checkboxes awards 2 out of 4 points.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["positive", "validation"],
        tags: ["assessment", "grading", "math"],
        steps: [
          { stepNumber: 1, instruction: "Select option A (correct).", expectedResult: "Checkbox A selected." },
          { stepNumber: 2, instruction: "Submit quiz and review grade breakdown.", expectedResult: "Score reflects 2.0 / 4.0 points for question." }
        ]
      },
      {
        key: "LEARN-008",
        sequenceNumber: 8,
        moduleName: "Lesson Multimedia",
        title: "Video Playback Resume Timestamp across Devices",
        description: "Ensure video playback progress bookmarks every 10 seconds and resumes on mobile device.",
        preconditions: "Student watched 14 minutes and 32 seconds of video lecture on desktop.",
        expectedResult: "Opening identical lesson on mobile browser prompts 'Resume from 14:32?'.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["integration", "compatibility"],
        tags: ["video", "multimedia", "cross-device"],
        steps: [
          { stepNumber: 1, instruction: "Play video to 14:32 and navigate away.", expectedResult: "API syncs video_progress: 872s." },
          { stepNumber: 2, instruction: "Open lesson in separate browser session.", expectedResult: "Video player initializes at 14:32." }
        ]
      },
      {
        key: "LEARN-009",
        sequenceNumber: 9,
        moduleName: "Course Management",
        title: "Drag and Drop Module Hierarchy Reordering",
        description: "Verify instructor can reorder lesson chapters and order persists in database.",
        preconditions: "Course has 3 modules: Module 1, Module 2, Module 3.",
        expectedResult: "Dragging Module 3 to the top updates sequence numbers: Module 3 becomes #1.",
        priority: "low",
        lifecycle: "ready",
        testTypes: ["positive", "ui"],
        tags: ["curriculum", "ordering", "ui"],
        steps: [
          { stepNumber: 1, instruction: "Drag Module 3 handle above Module 1.", expectedResult: "Module snaps into position #1." },
          { stepNumber: 2, instruction: "Refresh browser page.", expectedResult: "Order persists with Module 3 as first chapter." }
        ]
      },
      {
        key: "LEARN-010",
        sequenceNumber: 10,
        moduleName: "Authentication & RBAC",
        title: "Revoke Student Access Instantly upon Account Suspension",
        description: "Verify that setting student account status to 'suspended' immediately invalidates JWT session.",
        preconditions: "Student actively logged in and navigating courses.",
        expectedResult: "Next API request returns 401 Unauthorized and redirects to /login with suspension notice.",
        priority: "critical",
        lifecycle: "ready",
        testTypes: ["security", "negative"],
        tags: ["rbac", "security", "revocation"],
        steps: [
          { stepNumber: 1, instruction: "Admin toggles student status to 'suspended'.", expectedResult: "Student record updated." },
          { stepNumber: 2, instruction: "Student clicks Next Lesson in active tab.", expectedResult: "Session terminated; redirected to login with explanation." }
        ]
      },
      {
        key: "LEARN-011",
        sequenceNumber: 11,
        moduleName: "Learning Progress Tracker",
        title: "Certificate of Completion Generation on 100% Course Progress",
        description: "Ensure PDF certificate with cryptographic verification hash generates when all lessons complete.",
        preconditions: "Student has completed 19 of 20 lessons; passes final quiz.",
        expectedResult: "'Download Certificate' button appears with unique verification serial number.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["positive", "integration"],
        tags: ["certificate", "completion", "pdf"],
        steps: [
          { stepNumber: 1, instruction: "Submit final lesson completion.", expectedResult: "Course progress bar reaches 100%." },
          { stepNumber: 2, instruction: "Click 'View Certificate'.", expectedResult: "PDF renders with student name, completion date, and QR code." }
        ]
      },
      {
        key: "LEARN-012",
        sequenceNumber: 12,
        moduleName: "Assessment & Quiz Grading",
        title: "Randomize Question Sequence from Question Pool",
        description: "Verify that when 'Randomize Questions' is enabled, two students receive different question orders.",
        preconditions: "Quiz configured to draw 5 random questions from a pool of 20 questions.",
        expectedResult: "Student A and Student B receive distinct question sequences.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["positive", "edge_case"],
        tags: ["assessment", "randomization", "integrity"],
        steps: [
          { stepNumber: 1, instruction: "Start quiz as Student A.", expectedResult: "Questions 4, 12, 1, 19, 8 presented." },
          { stepNumber: 2, instruction: "Start quiz as Student B.", expectedResult: "Different sequence presented, preventing answer copying." }
        ]
      },
      {
        key: "LEARN-013",
        sequenceNumber: 13,
        moduleName: "Lesson Multimedia",
        title: "PDF Lesson Download Watermarking with Student Email",
        description: "Ensure downloadable course supplementary PDFs dynamically embed the student's email watermark.",
        preconditions: "Course has downloadable resource 'Cheatsheet.pdf'.",
        expectedResult: "Downloaded PDF contains semi-transparent footer 'Licensed to student@example.com'.",
        priority: "low",
        lifecycle: "draft",
        testTypes: ["security", "integration"],
        tags: ["multimedia", "watermark", "pdf"],
        steps: [
          { stepNumber: 1, instruction: "Click 'Download Resources'.", expectedResult: "PDF generated with student email watermark." }
        ]
      },
      {
        key: "LEARN-014",
        sequenceNumber: 14,
        moduleName: "Enrollment Engine",
        title: "Prerequisite Course Verification Prior to Advanced Enrollment",
        description: "Verify student cannot enroll in 'Advanced React Patterns' without passing 'React Fundamentals'.",
        preconditions: "Student has not completed 'React Fundamentals'.",
        expectedResult: "Enrollment button displays 'Prerequisite Required: React Fundamentals'.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["validation", "negative"],
        tags: ["enrollment", "prerequisites"],
        steps: [
          { stepNumber: 1, instruction: "Navigate to Advanced React course page.", expectedResult: "Prerequisite warning badge visible." },
          { stepNumber: 2, instruction: "Attempt to click enroll.", expectedResult: "Modal prompts user to complete prerequisite first." }
        ]
      },
      {
        key: "LEARN-015",
        sequenceNumber: 15,
        moduleName: "Course Management",
        title: "Archive Outdated Curriculum Version without Deleting Student History",
        description: "Validate that archiving v1 of course retains historical completion records for existing alumni.",
        preconditions: "50 students graduated from Course v1; new Course v2 published.",
        expectedResult: "Course v1 marked 'archived'; alumni can still access earned certificates.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["regression", "state_transition"],
        tags: ["curriculum", "archive", "history"],
        steps: [
          { stepNumber: 1, instruction: "Archive Course v1.", expectedResult: "Status changes to 'archived'; hidden from public catalog." },
          { stepNumber: 2, instruction: "Log in as alumnus and view profile.", expectedResult: "Certificate for Course v1 remains accessible." }
        ]
      },
      {
        key: "LEARN-016",
        sequenceNumber: 16,
        moduleName: "Learning Progress Tracker",
        title: "Daily Learning Streak Calculation and Timezone Normalization",
        description: "Ensure that student learning actions in different timezones calculate consecutive day streak correctly.",
        preconditions: "Student in GMT+8 studies at 11:30 PM on Monday and 1:00 AM on Wednesday (local Tuesday night).",
        expectedResult: "Streak counter increments to 2 days without timezone date distortion.",
        priority: "low",
        lifecycle: "ready",
        testTypes: ["edge_case", "boundary_value"],
        tags: ["gamification", "streak", "timezones"],
        steps: [
          { stepNumber: 1, instruction: "Record lesson activity.", expectedResult: "Activity timestamp stored in UTC." },
          { stepNumber: 2, instruction: "Compute streak based on student profile timezone.", expectedResult: "Streak reflects consecutive calendar days in local zone." }
        ]
      },
      {
        key: "LEARN-017",
        sequenceNumber: 17,
        moduleName: "Authentication & RBAC",
        title: "SAML 2.0 Corporate Identity Provider Single Logout (SLO)",
        description: "Validate that logging out from corporate portal terminates enterprise LMS session.",
        preconditions: "User authenticated via Okta SAML 2.0.",
        expectedResult: "IdP SLO signal triggers local session destruction and redirects to login.",
        priority: "high",
        lifecycle: "draft",
        testTypes: ["security", "integration"],
        tags: ["saml", "sso", "security"],
        steps: [
          { stepNumber: 1, instruction: "Trigger SLO request from IdP.", expectedResult: "LMS receives logout request and clears session cookie." }
        ]
      },
      {
        key: "LEARN-018",
        sequenceNumber: 18,
        moduleName: "Assessment & Quiz Grading",
        title: "Prevent Multiple Quiz Submissions when Max Attempts = 1",
        description: "Ensure students cannot retake exams configured with single attempt policy.",
        preconditions: "Student has submitted Attempt #1 with grade 85%.",
        expectedResult: "'Retake Quiz' button disabled; previous grade summary displayed.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["negative", "validation"],
        tags: ["assessment", "retake", "limits"],
        steps: [
          { stepNumber: 1, instruction: "Navigate back to submitted quiz.", expectedResult: "Message: 'You have used all allowed attempts (1/1)'." }
        ]
      },
      {
        key: "LEARN-019",
        sequenceNumber: 19,
        moduleName: "Lesson Multimedia",
        title: "Captions and Screen Reader Accessibility for Video Lectures",
        description: "Validate WebVTT subtitles toggle accurately and transcript accordion is accessible via keyboard.",
        preconditions: "Video lesson has English and Spanish WebVTT caption tracks.",
        expectedResult: "Selecting Spanish captions renders subtitle cues synchronized with audio track.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["compatibility", "positive"],
        tags: ["accessibility", "a11y", "captions"],
        steps: [
          { stepNumber: 1, instruction: "Click CC button on video player.", expectedResult: "Menu displays 'English', 'Spanish', 'Off'." },
          { stepNumber: 2, instruction: "Select 'Spanish'.", expectedResult: "Spanish subtitles render over video frame." }
        ]
      },
      {
        key: "LEARN-020",
        sequenceNumber: 20,
        moduleName: "Course Management",
        title: "Legacy Flash Content Player Deprecation Notice [DEPRECATED]",
        description: "Historical test case verifying removal of Adobe Flash interactive lessons.",
        preconditions: "Course created in 2018 containing legacy .swf asset.",
        expectedResult: "Displays notice: 'Flash is no longer supported. Please convert asset to HTML5/SCORM'.",
        priority: "low",
        lifecycle: "deprecated",
        testTypes: ["regression"],
        tags: ["legacy", "deprecated", "flash"],
        steps: [
          { stepNumber: 1, instruction: "Open legacy lesson URL.", expectedResult: "Migration advisory notice displayed." }
        ]
      }
    ]
  },

  // --------------------------------------------------------------------------
  // PROJECT 3: Service Desk Portal (HELP)
  // --------------------------------------------------------------------------
  {
    name: "Service Desk Portal",
    key: "HELP",
    description: "IT support ticketing system with automatic routing, SLA countdowns, and agent assignment.",
    modules: [
      { name: "Ticket Submission", description: "Customer self-service ticket creation, forms, and email ingestion." },
      { name: "Routing & Assignment", description: "Skills-based routing, round-robin rules, and department assignment." },
      { name: "SLA Tracking & Escalations", description: "Time-to-first-response and resolution SLA clocks, business hours calculation." },
      { name: "Customer Communication", description: "Public customer replies, internal agent notes, and email notifications." },
      { name: "Analytics & Reporting", description: "CSAT satisfaction score, first-contact resolution rates, and agent backlog." }
    ],
    plans: [
      {
        name: "SLA Engine & Escalation Critical Path",
        description: "Verification of breach warnings, manager escalation triggers, and weekend business hour offsets.",
        scopeNotes: "Strict focus on SLA calculations and automatic ticket reassignment.",
        targetRelease: "v3.1.0",
        environment: "staging",
        status: "active",
        caseKeys: ["HELP-001", "HELP-002", "HELP-003", "HELP-004", "HELP-005", "HELP-006", "HELP-007"]
      },
      {
        name: "Omnichannel Ticket Ingestion Verification",
        description: "Validate ticket creation via web portal, email parsing, and REST API.",
        scopeNotes: "Covers Ticket Submission and Routing & Assignment modules.",
        targetRelease: "v3.2.0",
        environment: "uat",
        status: "draft",
        caseKeys: ["HELP-001", "HELP-003", "HELP-008", "HELP-009"]
      }
    ],
    runs: [
      {
        name: "Helpdesk Core E2E Run",
        planName: "SLA Engine & Escalation Critical Path",
        environment: "staging",
        buildVersion: "build-help-3.1.8",
        status: "in_progress",
        notes: "Live staging execution of SLA engine and agent assignment matrix.",
        cases: [
          {
            caseKey: "HELP-001",
            status: "passed",
            attempts: [
              {
                attemptNumber: 1,
                status: "passed",
                actualResult: "Incident automatically assigned to on-call Tier 2 agent.",
                durationSeconds: 15
              }
            ]
          },
          {
            caseKey: "HELP-002",
            status: "failed",
            attempts: [
              {
                attemptNumber: 1,
                status: "failed",
                actualResult: "SLA breach warning email was not dispatched at 80% mark due to queue worker delay.",
                durationSeconds: 24
              }
            ]
          },
          {
            caseKey: "HELP-003",
            status: "passed",
            attempts: [
              {
                attemptNumber: 1,
                status: "passed",
                actualResult: "Oversized 28MB attachment correctly blocked with user notification.",
                durationSeconds: 11
              }
            ]
          },
          {
            caseKey: "HELP-004",
            status: "blocked",
            attempts: [
              {
                attemptNumber: 1,
                status: "blocked",
                actualResult: "Blocked: DLP PII redaction microservice endpoint returned 503 Service Unavailable.",
                durationSeconds: 7
              }
            ]
          },
          {
            caseKey: "HELP-005",
            status: "skipped",
            attempts: [
              {
                attemptNumber: 1,
                status: "skipped",
                actualResult: "Skipped: Automated CSV reporting cron job is suspended for maintenance.",
                durationSeconds: 0
              }
            ]
          },
          {
            caseKey: "HELP-006",
            status: "not_run"
          },
          {
            caseKey: "HELP-007",
            status: "not_run"
          }
        ]
      }
    ],
    testCases: [
      {
        key: "HELP-001",
        sequenceNumber: 1,
        moduleName: "Routing & Assignment",
        title: "Automated Round-Robin Agent Assignment for Priority Incidents",
        description: "Verify critical incident ticket assigns to next available agent with lowest active ticket count.",
        preconditions: "Agents Alice (3 tickets) and Bob (1 ticket) are online and in Tier 1 queue.",
        expectedResult: "New incoming ticket automatically assigns to Bob; Bob's backlog increments to 2.",
        priority: "critical",
        lifecycle: "ready",
        testTypes: ["positive", "integration"],
        tags: ["routing", "assignment", "smoke"],
        steps: [
          { stepNumber: 1, instruction: "Submit new incident with Priority: High.", expectedResult: "Ticket created with ID HELP-TICK-101." },
          { stepNumber: 2, instruction: "Query assignee field on ticket.", expectedResult: "Assigned to Bob (agent with lowest load)." }
        ]
      },
      {
        key: "HELP-002",
        sequenceNumber: 2,
        moduleName: "SLA Tracking & Escalations",
        title: "SLA Breach Warning Notification at 80% Elapsed Time Window",
        description: "Ensure warning notification fires to team lead when ticket reaches 80% of response SLA.",
        preconditions: "Ticket has 1-hour response SLA (breach at 60 mins); 48 minutes have elapsed without reply.",
        expectedResult: "Ticket card badges yellow 'SLA Warning' and notification sent to #support-escalations.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["boundary_value", "edge_case"],
        tags: ["sla", "escalation", "notifications"],
        steps: [
          { stepNumber: 1, instruction: "Simulate ticket timestamp 48 minutes in past with no agent reply.", expectedResult: "SLA clock shows 12m remaining (80% consumed)." },
          { stepNumber: 2, instruction: "Inspect ticket status in dashboard.", expectedResult: "Urgency flag turns amber; warning alert dispatched." }
        ]
      },
      {
        key: "HELP-003",
        sequenceNumber: 3,
        moduleName: "Ticket Submission",
        title: "Reject Ticket File Attachment Exceeding 25MB Limit",
        description: "Validate that customer upload of 30MB log archive triggers immediate validation error.",
        preconditions: "Customer filling out ticket submission form.",
        expectedResult: "Upload rejected client-side with error 'Attachment exceeds 25MB limit'.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["boundary_value", "negative", "validation"],
        tags: ["attachments", "upload", "validation"],
        steps: [
          { stepNumber: 1, instruction: "Drag 28MB file 'crashdump.zip' into attachment area.", expectedResult: "Upload progress bar halts with red error banner." },
          { stepNumber: 2, instruction: "Attempt to click 'Submit Ticket'.", expectedResult: "Submission blocked until invalid attachment removed." }
        ]
      },
      {
        key: "HELP-004",
        sequenceNumber: 4,
        moduleName: "Customer Communication",
        title: "Mask PII and Sensitive Tokens in Public Customer Replies",
        description: "Verify that Data Loss Prevention (DLP) filters mask credit cards, API keys, and passwords.",
        preconditions: "Support agent types customer reply containing string 'api_key_live_98124'.",
        expectedResult: "System prompts agent: 'Sensitive token detected. Mask before sending?' and redacts string.",
        priority: "critical",
        lifecycle: "ready",
        testTypes: ["security", "positive"],
        tags: ["dlp", "security", "privacy"],
        steps: [
          { stepNumber: 1, instruction: "Type reply containing pattern 'Bearer sk_live_abc123'.", expectedResult: "DLP inspector highlights token in yellow." },
          { stepNumber: 2, instruction: "Click 'Send Reply'.", expectedResult: "String transmitted to customer as 'Bearer [REDACTED_API_KEY]'." }
        ]
      },
      {
        key: "HELP-005",
        sequenceNumber: 5,
        moduleName: "Analytics & Reporting",
        title: "Export Daily Agent Resolution Metrics to RFC 4180 CSV",
        description: "Verify administrator can export daily report with Agent Name, Tickets Closed, Avg SLA, and CSAT.",
        preconditions: "10 tickets closed today across 3 agents.",
        expectedResult: "Downloaded CSV file formats correctly according to RFC 4180 standards.",
        priority: "low",
        lifecycle: "ready",
        testTypes: ["positive", "integration"],
        tags: ["reporting", "csv", "export"],
        steps: [
          { stepNumber: 1, instruction: "Navigate to Analytics -> Reports.", expectedResult: "Reporting dashboard visible." },
          { stepNumber: 2, instruction: "Click 'Export CSV (Today)'.", expectedResult: "CSV file downloads; contains valid headers and rows without corruption." }
        ]
      },
      {
        key: "HELP-006",
        sequenceNumber: 6,
        moduleName: "Customer Communication",
        title: "Private Internal Note Visibility Restricted to Support Agents",
        description: "Ensure customer portal accounts cannot view private agent internal notes.",
        preconditions: "Ticket contains 2 public customer replies and 1 yellow internal note.",
        expectedResult: "Logged-in customer sees only 2 public replies; internal note completely omitted from DOM.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["security", "permission_security"],
        tags: ["communication", "privacy", "rbac"],
        steps: [
          { stepNumber: 1, instruction: "Agent adds internal note: 'Customer has history of abusive language'.", expectedResult: "Note appears with yellow background." },
          { stepNumber: 2, instruction: "Log in as ticket requester and view ticket thread.", expectedResult: "Internal note is not visible in thread or network API response." }
        ]
      },
      {
        key: "HELP-007",
        sequenceNumber: 7,
        moduleName: "SLA Tracking & Escalations",
        title: "Pause SLA Clock when Ticket Status is 'Pending Customer Action'",
        description: "Verify SLA resolution timer pauses when agent requests additional info from customer.",
        preconditions: "Ticket has 4 hours remaining on resolution SLA.",
        expectedResult: "Status change to 'waiting_on_customer' halts timer; resumes only when customer replies.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["positive", "state_transition"],
        tags: ["sla", "clock", "workflow"],
        steps: [
          { stepNumber: 1, instruction: "Agent changes status to 'Waiting on Customer'.", expectedResult: "SLA timer displays 'Paused (Waiting on Customer)'." },
          { stepNumber: 2, instruction: "Customer submits reply 2 hours later.", expectedResult: "Ticket re-opens to 'in_progress' with 4 hours still remaining." }
        ]
      },
      {
        key: "HELP-008",
        sequenceNumber: 8,
        moduleName: "Ticket Submission",
        title: "Email Ingestion Header Parsing for Spam and Auto-Replies",
        description: "Ensure support inbox ignores automated 'Out of Office' messages to prevent ticket reply loops.",
        preconditions: "Inbound email received with header 'Auto-Submitted: auto-replied'.",
        expectedResult: "Email parser drops message without creating duplicate ticket or triggering auto-response.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["edge_case", "negative"],
        tags: ["email", "spam", "loop-prevention"],
        steps: [
          { stepNumber: 1, instruction: "Dispatch mock inbound email with Auto-Submitted header.", expectedResult: "Parser logs 'Auto-reply detected; discarded'." }
        ]
      },
      {
        key: "HELP-009",
        sequenceNumber: 9,
        moduleName: "Routing & Assignment",
        title: "Department Routing based on Customer Organization Tier",
        description: "Validate enterprise customer tickets route directly to VIP Priority Support queue.",
        preconditions: "Customer company marked with SLA Tier 'Enterprise VIP'.",
        expectedResult: "Ticket automatically assigns to 'VIP Escalation Team' with 15-minute response SLA.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["positive", "integration"],
        tags: ["routing", "enterprise", "vip"],
        steps: [
          { stepNumber: 1, instruction: "Submit ticket from VIP user email.", expectedResult: "Department assigned: 'VIP Support' with 15m SLA target." }
        ]
      },
      {
        key: "HELP-010",
        sequenceNumber: 10,
        moduleName: "Analytics & Reporting",
        title: "Customer Satisfaction (CSAT) Survey One-Click Rating",
        description: "Ensure ticket resolution email allows customer to submit 1-5 star CSAT score via tokenized URL.",
        preconditions: "Ticket resolved; CSAT invitation sent to customer.",
        expectedResult: "Clicking 5-star link records CSAT score 5 and prompts for optional feedback comment.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["positive", "integration"],
        tags: ["csat", "feedback", "reporting"],
        steps: [
          { stepNumber: 1, instruction: "Click CSAT rating link with token.", expectedResult: "Displays 'Thank you for your rating: 5 Stars'." }
        ]
      },
      {
        key: "HELP-011",
        sequenceNumber: 11,
        moduleName: "Ticket Submission",
        title: "Custom Form Field Dynamic Visibility Based on Category",
        description: "Ensure selecting category 'Hardware Issue' dynamically reveals 'Serial Number' input.",
        preconditions: "User on ticket submission portal.",
        expectedResult: "Selecting Hardware displays Serial Number; selecting Billing hides it.",
        priority: "low",
        lifecycle: "ready",
        testTypes: ["positive", "ui"],
        tags: ["forms", "dynamic-fields", "ui"],
        steps: [
          { stepNumber: 1, instruction: "Select Category: 'Hardware'.", expectedResult: "'Device Serial Number' field appears with required asterisk." },
          { stepNumber: 2, instruction: "Switch Category to 'Billing Inquiry'.", expectedResult: "Serial Number field hides and removes validation requirement." }
        ]
      },
      {
        key: "HELP-012",
        sequenceNumber: 12,
        moduleName: "Routing & Assignment",
        title: "Skills-Based Language Routing for Non-English Tickets",
        description: "Verify tickets written in Japanese route to bilingual support staff.",
        preconditions: "Language detection flags incoming ticket as ja (Japanese).",
        expectedResult: "Ticket assigned to agent tagged with skill 'lang_ja'.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["integration", "positive"],
        tags: ["routing", "languages", "skills"],
        steps: [
          { stepNumber: 1, instruction: "Submit ticket with Japanese body text.", expectedResult: "Detected language = 'ja'; assigned to Kenji (lang_ja skill)." }
        ]
      },
      {
        key: "HELP-013",
        sequenceNumber: 13,
        moduleName: "SLA Tracking & Escalations",
        title: "Business Hours Calendar Excludes National Holidays from SLA",
        description: "Ensure SLA countdown clock freezes over national holiday weekends.",
        preconditions: "Holiday calendar configured with 'New Year's Day' (Jan 1).",
        expectedResult: "SLA clock does not count elapsed hours between 00:00 and 23:59 on holiday.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["boundary_value", "edge_case"],
        tags: ["sla", "calendar", "business-hours"],
        steps: [
          { stepNumber: 1, instruction: "Ticket created 5:00 PM on Friday preceding holiday.", expectedResult: "SLA resumes 9:00 AM on following business Tuesday." }
        ]
      },
      {
        key: "HELP-014",
        sequenceNumber: 14,
        moduleName: "Customer Communication",
        title: "Canned Response Macro Insertion into Agent Reply Editor",
        description: "Verify agent can trigger macro `#reset_password` to populate standardized instructions.",
        preconditions: "Macro `#reset_password` configured in portal.",
        expectedResult: "Typing macro replaces keyword with 3-paragraph formatted instructional template.",
        priority: "low",
        lifecycle: "ready",
        testTypes: ["positive", "ui"],
        tags: ["macros", "productivity", "canned"],
        steps: [
          { stepNumber: 1, instruction: "Type `#reset_password` in reply box.", expectedResult: "Autocomplete prompt suggests macro." },
          { stepNumber: 2, instruction: "Press Tab.", expectedResult: "Body populates with step-by-step password recovery guide." }
        ]
      },
      {
        key: "HELP-015",
        sequenceNumber: 15,
        moduleName: "Analytics & Reporting",
        title: "First Contact Resolution (FCR) Rate Metric Aggregation",
        description: "Verify tickets solved with single agent response calculate into FCR percentage.",
        preconditions: "10 tickets resolved today; 7 resolved with exactly 1 agent reply.",
        expectedResult: "Daily dashboard metrics display FCR = 70.0%.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["positive", "validation"],
        tags: ["analytics", "fcr", "metrics"],
        steps: [
          { stepNumber: 1, instruction: "Inspect Analytics dashboard.", expectedResult: "FCR card displays 70% with trending indicator." }
        ]
      },
      {
        key: "HELP-016",
        sequenceNumber: 16,
        moduleName: "Ticket Submission",
        title: "Captcha Verification on Public Anonymous Ticket Submissions",
        description: "Ensure unauthenticated guest ticket submissions require successful Turnstile/Captcha validation.",
        preconditions: "Anonymous guest user on ticket creation form.",
        expectedResult: "Submission blocked without passing interactive captcha verification.",
        priority: "high",
        lifecycle: "ready",
        testTypes: ["security", "negative"],
        tags: ["captcha", "security", "guest"],
        steps: [
          { stepNumber: 1, instruction: "Submit guest form without completing Captcha challenge.", expectedResult: "Error: 'Please complete the verification challenge'." }
        ]
      },
      {
        key: "HELP-017",
        sequenceNumber: 17,
        moduleName: "Routing & Assignment",
        title: "Agent Absence Out-of-Office Automatic Reassignment",
        description: "Validate that marking agent as 'Out of Office' reassigns open unresolved tickets to queue.",
        preconditions: "Agent Sarah has 4 open tickets; sets status to 'On Vacation'.",
        expectedResult: "Tickets unassigned and returned to triage pool for redistributing.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["state_transition", "positive"],
        tags: ["agent", "vacation", "reassignment"],
        steps: [
          { stepNumber: 1, instruction: "Set agent status to 'Out of Office'.", expectedResult: "Prompt: 'Reassign 4 active tickets to team queue?'." },
          { stepNumber: 2, instruction: "Confirm reassignment.", expectedResult: "Tickets moved back to unassigned triage pool." }
        ]
      },
      {
        key: "HELP-018",
        sequenceNumber: 18,
        moduleName: "Customer Communication",
        title: "Rich Text Markdown Rendering in Ticket Conversations",
        description: "Ensure code blocks, bold text, links, and lists render formatted HTML safely.",
        preconditions: "User inputs reply with fenced markdown code block ```bash npm test```.",
        expectedResult: "Comment renders as styled syntax-highlighted pre/code block without XSS script execution.",
        priority: "medium",
        lifecycle: "ready",
        testTypes: ["positive", "security"],
        tags: ["markdown", "rich-text", "xss"],
        steps: [
          { stepNumber: 1, instruction: "Input comment with markdown code fence.", expectedResult: "Renders syntax highlighted code block." }
        ]
      },
      {
        key: "HELP-019",
        sequenceNumber: 19,
        moduleName: "SLA Tracking & Escalations",
        title: "Manager Notification on Critical Severity SLA Breach Event",
        description: "Verify that ticket exceeding 100% resolution SLA immediately pages on-call engineering lead.",
        preconditions: "Priority: Critical ticket reaches 0m remaining without resolution.",
        expectedResult: "Automated webhook dispatches PagerDuty incident alert.",
        priority: "critical",
        lifecycle: "ready",
        testTypes: ["security", "integration", "boundary_value"],
        tags: ["sla", "pagerduty", "escalation"],
        steps: [
          { stepNumber: 1, instruction: "Allow critical incident to breach SLA window.", expectedResult: "Status badge flashes red 'SLA BREACHED'." }
        ]
      },
      {
        key: "HELP-020",
        sequenceNumber: 20,
        moduleName: "Ticket Submission",
        title: "Legacy XML SOAP Ticket Gateway [DEPRECATED]",
        description: "Historical test case verifying retirement of SOAP 1.1 XML web service.",
        preconditions: "Legacy client posting to /services/ticketService.asmx.",
        expectedResult: "Returns 410 Gone with pointer to modern JSON REST API.",
        priority: "low",
        lifecycle: "deprecated",
        testTypes: ["regression"],
        tags: ["soap", "legacy", "deprecated"],
        steps: [
          { stepNumber: 1, instruction: "POST SOAP envelope to legacy endpoint.", expectedResult: "HTTP 410 Gone returned." }
        ]
      }
    ]
  }
];
