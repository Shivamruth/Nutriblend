import {
  ArrowLeft,
  Bell,
  Briefcase,
  CheckCircle2,
  CreditCard,
  Gift,
  Headphones,
  HelpCircle,
  PackageCheck,
  Percent,
  ShieldCheck,
  Truck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import "../styles/account-page.css";

const HELP_EMAIL = "support@nutriblend.local";
const SUPPORT_HOURS = "10:00 AM to 7:00 PM, Monday to Saturday";

export const ACCOUNT_PAGE_CONTENT = {
  "customer-care": {
    title: "Customer Care",
    icon: Headphones,
    badge: "Support Desk",
    lead:
      "Get help with an order, payment, refund, delivery address, product availability, or account issue.",
    stats: [
      { label: "Support Hours", value: SUPPORT_HOURS },
      { label: "Email", value: HELP_EMAIL },
      { label: "Best For", value: "Order ID, payment ID, delivery issues" },
    ],
    stepsTitle: "Raise a Support Request",
    steps: [
      "Open Orders and Refunds and copy the NutriBlend order ID.",
      "Choose the issue type: order status, payment, refund, delivery, or product quality.",
      "Share photos only when the product is damaged, leaked, expired, or wrong.",
      "Support reviews the request and updates you from the Orders page.",
    ],
    sections: [
      {
        heading: "Fast Answers",
        lines: [
          "Payment deducted but order not visible: wait a few minutes, then contact support with payment ID.",
          "Wrong delivery address: update it before the order moves to preparation.",
          "Product unavailable after checkout: we will help with replacement or refund review.",
        ],
      },
      {
        heading: "What To Keep Ready",
        lines: ["Order ID", "Registered email or phone", "Payment screenshot if payment failed"],
      },
    ],
    action: "Open Orders",
    actionPage: "orders",
  },
  "invite-friends": {
    title: "Invite Friends & Earn",
    icon: UserPlus,
    badge: "Referral Program",
    lead:
      "Invite gym friends to NutriBlend and earn rewards when the referral program is active.",
    stats: [
      { label: "Reward Type", value: "Wallet credit or coupon" },
      { label: "Who Can Join", value: "Registered NutriBlend customers" },
      { label: "Status", value: "Coming soon" },
    ],
    stepsTitle: "How Referrals Will Work",
    steps: [
      "Share your NutriBlend referral code with a new customer.",
      "Your friend signs up and places an eligible first order.",
      "After delivery is confirmed, reward credit is added to your account.",
      "Use the reward on eligible protein shakes, plans, or supplements.",
    ],
    sections: [
      {
        heading: "Referral Rules",
        lines: [
          "Cancelled or refunded orders will not unlock referral rewards.",
          "Self-referrals and duplicate accounts are not eligible.",
          "Rewards may have minimum order values or expiry dates.",
        ],
      },
    ],
    action: "Shop Protein",
    actionPage: "home",
  },
  wallet: {
    title: "NutriBlend Wallet",
    icon: Wallet,
    badge: "Credits & Refunds",
    lead:
      "Track refund credits, promotional rewards, and usable wallet balance for future NutriBlend orders.",
    stats: [
      { label: "Available Balance", value: "Rs. 0" },
      { label: "Pending Refunds", value: "Rs. 0" },
      { label: "Usable On", value: "Eligible checkout orders" },
    ],
    stepsTitle: "How Wallet Credits Work",
    steps: [
      "COD refunds may be issued as wallet credit when bank details are not available.",
      "Promotional credits can have an expiry date and minimum cart value.",
      "Wallet balance is shown before payment when eligible.",
      "If an order is cancelled, used wallet credit is restored after review.",
    ],
    sections: [
      {
        heading: "Recent Activity",
        lines: ["No wallet activity yet.", "Refund and reward entries will appear here."],
      },
      {
        heading: "Important",
        lines: [
          "Wallet credits cannot always be transferred to bank accounts.",
          "Promotional wallet credits may not apply to every product.",
        ],
      },
    ],
  },
  "saved-cards": {
    title: "Saved Cards",
    icon: CreditCard,
    badge: "Payment Methods",
    lead:
      "View and manage saved payment methods used during secure online checkout.",
    stats: [
      { label: "Saved Cards", value: "0" },
      { label: "Security", value: "Handled by payment provider" },
      { label: "COD", value: "Available when enabled" },
    ],
    stepsTitle: "Payment Safety",
    steps: [
      "NutriBlend does not store full card numbers inside the app.",
      "Online payments are processed by the payment provider.",
      "Use saved methods only on trusted personal devices.",
    ],
    sections: [
      {
        heading: "Cards",
        lines: ["No saved cards yet.", "Add a payment card during checkout when supported."],
      },
    ],
    action: "Go to Cart",
    actionPage: "cart",
  },
  rewards: {
    title: "My Rewards",
    icon: Gift,
    badge: "Offers",
    lead:
      "Your coupons, loyalty benefits, and future NutriBlend reward milestones live here.",
    stats: [
      { label: "Active Rewards", value: "0" },
      { label: "Reward Source", value: "Orders, referrals, campaigns" },
      { label: "Applies To", value: "Eligible products and plans" },
    ],
    stepsTitle: "How To Use Rewards",
    steps: [
      "Check this page before placing an order.",
      "Apply an eligible coupon or reward during checkout.",
      "Review the discount before payment.",
      "Complete the order before the reward expires.",
    ],
    sections: [
      {
        heading: "Available Rewards",
        lines: ["No active rewards right now.", "New rewards will appear during campaigns."],
      },
      {
        heading: "Reward Tips",
        lines: ["Complete your profile.", "Keep ordering consistently.", "Watch for plan and shake offers."],
      },
    ],
    action: "Explore Products",
    actionPage: "home",
  },
  notifications: {
    title: "Notifications",
    icon: Bell,
    badge: "Alerts",
    lead:
      "Manage the updates you receive about orders, payments, offers, and account activity.",
    stats: [
      { label: "Order Alerts", value: "Enabled" },
      { label: "Payment Alerts", value: "Enabled" },
      { label: "Offers", value: "Enabled" },
    ],
    stepsTitle: "Notification Types",
    steps: [
      "Order placed and payment confirmation.",
      "Preparation, out-for-delivery, delivered, or cancelled updates.",
      "Refund and wallet-credit status.",
      "New products, plan offers, and coupon campaigns.",
    ],
    sections: [
      {
        heading: "Preference",
        lines: [
          "Critical order and payment notifications stay enabled.",
          "Promotional alerts can be managed when preference settings are added.",
        ],
      },
    ],
  },
  "return-demo": {
    title: "Return Creation Demo",
    icon: PackageCheck,
    badge: "Return Flow",
    lead:
      "A guided preview of the information needed to request a return or refund review.",
    stats: [
      { label: "Best For", value: "Wrong, damaged, leaked, expired item" },
      { label: "Photos", value: "Recommended" },
      { label: "Review", value: "Support approval required" },
    ],
    stepsTitle: "Return Request Preview",
    steps: [
      "Select the delivered order from Orders and Refunds.",
      "Choose the product and return reason.",
      "Add photos of seal, label, invoice, and damaged area if applicable.",
      "Submit the request and wait for pickup or refund instructions.",
    ],
    sections: [
      {
        heading: "Return Reasons",
        lines: ["Wrong item received", "Damaged or leaked packaging", "Expired product", "Quality issue"],
      },
    ],
    action: "Open Orders",
    actionPage: "orders",
  },
  "how-to-return": {
    title: "How To Return",
    icon: HelpCircle,
    badge: "Help Guide",
    lead:
      "Understand when a NutriBlend item can be returned and what you need before support can approve it.",
    stats: [
      { label: "Return Window", value: "Check product/order details" },
      { label: "Condition", value: "Unused and sealed when required" },
      { label: "Proof", value: "Invoice and photos" },
    ],
    stepsTitle: "Return Steps",
    steps: [
      "Go to Orders and Refunds.",
      "Open the delivered order.",
      "Choose the return or support option.",
      "Select a reason and add clear evidence.",
      "Wait for support confirmation before disposing of packaging.",
    ],
    sections: [
      {
        heading: "Usually Not Returnable",
        lines: [
          "Opened consumable products unless there is a verified quality issue.",
          "Products damaged after delivery.",
          "Items missing original labels, invoice, or batch details.",
        ],
      },
    ],
  },
  coupon: {
    title: "How Do I Redeem My Coupon?",
    icon: Percent,
    badge: "Coupons",
    lead:
      "Apply eligible NutriBlend coupon codes during checkout before placing your order.",
    stats: [
      { label: "Apply At", value: "Checkout" },
      { label: "Eligibility", value: "Product, cart value, expiry" },
      { label: "Status", value: "Shown before payment" },
    ],
    stepsTitle: "Redeem A Coupon",
    steps: [
      "Add eligible products or plans to your cart.",
      "Open checkout and find the coupon or offer section.",
      "Enter the coupon code exactly as shown.",
      "Check the final total before payment.",
    ],
    sections: [
      {
        heading: "Why A Coupon May Fail",
        lines: [
          "Minimum order value not met.",
          "Coupon expired or not active yet.",
          "Product or plan is not part of the offer.",
          "Coupon already used on another order.",
        ],
      },
    ],
    action: "Shop Now",
    actionPage: "home",
  },
  terms: {
    title: "Terms & Conditions",
    icon: ShieldCheck,
    badge: "Terms",
    lead:
      "These terms explain the basic rules for using NutriBlend, placing orders, and managing your account.",
    stats: [
      { label: "Applies To", value: "All NutriBlend customers" },
      { label: "Orders", value: "Subject to stock and confirmation" },
      { label: "Account", value: "Keep details accurate" },
    ],
    stepsTitle: "Main Terms",
    steps: [
      "Use correct profile, phone, and delivery details.",
      "Orders are confirmed only after payment/COD validation and stock availability.",
      "NutriBlend may cancel unavailable or suspicious orders.",
      "Refunds, returns, promotions, and delivery follow their own policy pages.",
    ],
    sections: [
      {
        heading: "Customer Responsibility",
        lines: [
          "Do not misuse coupons or referral rewards.",
          "Do not create duplicate accounts to bypass limits.",
          "Review ingredients and product suitability before ordering.",
        ],
      },
    ],
  },
  "promotion-terms": {
    title: "Promotions Terms & Conditions",
    icon: Percent,
    badge: "Offers",
    lead:
      "Promotional discounts, coupons, and campaigns may have separate eligibility and expiry rules.",
    stats: [
      { label: "Offer Type", value: "Coupons, bundles, wallet credits" },
      { label: "Combining Offers", value: "May be restricted" },
      { label: "Refund Impact", value: "Discount may be adjusted" },
    ],
    stepsTitle: "Promotion Rules",
    steps: [
      "Each offer may have a minimum cart value.",
      "Some offers apply only to selected products or plans.",
      "NutriBlend may pause, change, or withdraw campaigns.",
      "If an order is returned or cancelled, promotional benefits may be reversed.",
    ],
    sections: [
      {
        heading: "Before Checkout",
        lines: [
          "Check final payable amount.",
          "Read coupon conditions shown with the offer.",
          "Use the offer before it expires.",
        ],
      },
    ],
  },
  "refund-policy": {
    title: "Returns & Refunds Policy",
    icon: PackageCheck,
    badge: "Policy",
    lead:
      "NutriBlend reviews returns and refunds based on order status, product condition, payment method, and support approval.",
    stats: [
      { label: "COD Refund", value: "Wallet or supported refund method" },
      { label: "Online Refund", value: "Payment provider timeline" },
      { label: "Return Proof", value: "May be required" },
    ],
    stepsTitle: "Refund Flow",
    steps: [
      "Submit cancellation, return, or refund request from Orders.",
      "Support checks order status, product condition, and payment details.",
      "Approved refunds are initiated to the original method or wallet when applicable.",
      "Refund completion depends on bank, wallet, or payment provider timelines.",
    ],
    sections: [
      {
        heading: "Return Eligibility",
        lines: [
          "Wrong item, damaged packaging, leakage, expiry, or verified quality issue.",
          "Unused and sealed condition may be required for nutrition products.",
          "Final decision depends on support verification.",
        ],
      },
    ],
    action: "View Orders",
    actionPage: "orders",
  },
  privacy: {
    title: "We Respect Your Privacy",
    icon: ShieldCheck,
    badge: "Privacy",
    lead:
      "NutriBlend uses your information to run accounts, delivery, payments, support, and order tracking.",
    stats: [
      { label: "Profile Data", value: "Name, email, phone" },
      { label: "Delivery Data", value: "Addresses and phone" },
      { label: "Order Data", value: "Products, payments, invoices" },
    ],
    stepsTitle: "How Data Is Used",
    steps: [
      "To authenticate your account.",
      "To deliver products to the correct address.",
      "To process payments, COD orders, invoices, and refunds.",
      "To support customer care and order history.",
    ],
    sections: [
      {
        heading: "Privacy Promise",
        lines: [
          "We keep account data limited to service needs.",
          "Payment security is handled through payment-provider systems.",
          "You should keep your password and device secure.",
        ],
      },
    ],
  },
  "fees-payments": {
    title: "Fees & Payments",
    icon: CreditCard,
    badge: "Payment Policy",
    lead:
      "Understand checkout totals, payment methods, COD rules, refunds, and failed payment handling.",
    stats: [
      { label: "Payment Options", value: "COD and online when available" },
      { label: "Final Amount", value: "Shown before placing order" },
      { label: "Failed Payment", value: "Check Orders before retrying" },
    ],
    stepsTitle: "Payment Guidance",
    steps: [
      "Review item price, delivery charge, discounts, and payable total.",
      "For online payment, wait for confirmation before retrying.",
      "If money is deducted but order is missing, contact support with payment proof.",
      "COD availability can change based on address, order value, or internal checks.",
    ],
    sections: [
      {
        heading: "Refund Mode",
        lines: [
          "Online payments generally refund through the payment route used.",
          "COD refunds may be issued as wallet/store credit or another supported method.",
        ],
      },
    ],
  },
  shipping: {
    title: "Delivery and Shipping Policy",
    icon: Truck,
    badge: "Delivery",
    lead:
      "NutriBlend delivery depends on your selected address, product availability, order confirmation, and delivery partner coverage.",
    stats: [
      { label: "Address", value: "Select before payment" },
      { label: "Tracking", value: "Orders page" },
      { label: "Phone", value: "Keep reachable" },
    ],
    stepsTitle: "Delivery Flow",
    steps: [
      "Select a saved delivery address.",
      "Place the order and wait for confirmation.",
      "Track order status from Orders and Refunds.",
      "Receive the product and verify packaging before use.",
    ],
    sections: [
      {
        heading: "Delivery Issues",
        lines: [
          "Wrong address: update before preparation starts.",
          "Missed delivery: support or delivery partner may attempt again.",
          "Damaged parcel: take photos before opening and contact support.",
        ],
      },
    ],
    action: "Manage Address",
    actionPage: "address",
  },
  "who-we-are": {
    title: "Who We Are",
    icon: Users,
    badge: "About NutriBlend",
    lead:
      "NutriBlend is built around easy ordering for protein shakes, supplements, fitness plans, and daily nutrition support.",
    stats: [
      { label: "Focus", value: "Fitness fuel" },
      { label: "Experience", value: "Browse, cart, checkout, track" },
      { label: "For", value: "Gym, sports, and daily protein users" },
    ],
    stepsTitle: "What We Offer",
    steps: [
      "Protein shakes and supplement products.",
      "Fitness plans and nutrition-focused bundles.",
      "Cart, address, payment, and order tracking flows.",
      "Account tools for support, refunds, rewards, and policies.",
    ],
    sections: [
      {
        heading: "Our Aim",
        lines: [
          "Make fitness nutrition ordering simple.",
          "Keep checkout and order tracking clear.",
          "Support customers after purchase.",
        ],
      },
    ],
    action: "Explore Products",
    actionPage: "home",
  },
  careers: {
    title: "Join Our Team",
    icon: Briefcase,
    badge: "Careers",
    lead:
      "Work with NutriBlend across operations, customer care, product management, delivery, and growth roles.",
    stats: [
      { label: "Open Roles", value: "Coming soon" },
      { label: "Work Areas", value: "Support, ops, product, delivery" },
      { label: "Updates", value: "Check this page later" },
    ],
    stepsTitle: "Future Hiring Areas",
    steps: [
      "Customer support executives.",
      "Delivery operations coordinators.",
      "Product and stock management.",
      "Fitness content and growth roles.",
    ],
    sections: [
      {
        heading: "Current Openings",
        lines: ["No openings listed right now.", "This page will show role details when hiring starts."],
      },
    ],
  },
};

export default function AccountPage({ pageId, setPage }) {
  const content = ACCOUNT_PAGE_CONTENT[pageId] || ACCOUNT_PAGE_CONTENT["customer-care"];
  const Icon = content.icon;

  return (
    <div className="account-info-page">
      <button
        type="button"
        className="account-info-back"
        onClick={() => setPage?.("profile")}
      >
        <ArrowLeft size={20} />
        My Account
      </button>

      <section className="account-info-hero">
        <div className="account-info-hero-top">
          <span className="account-info-icon">
            <Icon size={30} />
          </span>
          <span className="account-info-badge">{content.badge}</span>
        </div>
        <h1>{content.title}</h1>
        <p>{content.lead}</p>
      </section>

      <div className="account-info-stats">
        {content.stats.map((item) => (
          <div className="account-info-stat" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>

      <section className="account-info-card account-info-steps">
        <h2>{content.stepsTitle}</h2>
        <div className="account-info-step-list">
          {content.steps.map((step, index) => (
            <div className="account-info-step" key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="account-info-sections">
        {content.sections.map((section) => (
          <section className="account-info-card" key={section.heading}>
            <h2>{section.heading}</h2>
            <div className="account-info-lines">
              {section.lines.map((line) => (
                <p key={line}>
                  <CheckCircle2 size={18} />
                  {line}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {content.action && (
        <button
          type="button"
          className="account-info-action"
          onClick={() => setPage?.(content.actionPage)}
        >
          {content.action}
        </button>
      )}
    </div>
  );
}
