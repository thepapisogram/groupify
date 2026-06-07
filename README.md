# Groupify

Groupify is a modern, responsive web application designed to simplify the creation, management, and distribution of custom forms and dynamic groups. From crafting bespoke data-collection forms to running complex grouping algorithms via Web Workers, Groupify acts as a powerful all-in-one productivity suite for teams and educators.

![Groupify Overview](./public/logo.webp)

## 🚀 Key Features

*   **Dynamic Form Builder**: Construct custom forms with rich input types (text, checkboxes, multi-select). Forms can be dynamically enabled/disabled and shared via unique public links.
*   **Algorithmic Group Generation**: Run client-side grouping algorithms (powered by dedicated Web Workers to keep the UI unblocked) that distribute form respondents into optimal teams based on custom criteria (e.g. equal distribution, specific sizes).
*   **Secure Team Collaboration**: Invite other users to manage your forms via secure, token-based email invitations powered by Resend. Collaborators can view submissions, run grouping algorithms, and manage form statuses.
*   **Data Export Pipeline**: Instantly export your generated groups and raw submissions into formatted Excel spreadsheets (`exceljs`) and Word documents (`docx`).
*   **Authentication & Identity**: Fully integrated with NextAuth.js and MongoDB, supporting secure Email/Password and Google OAuth logins.
*   **Monetization / Donations**: Integrated with Paystack to seamlessly accept donations and process secure transactions directly within the platform.
*   **Premium Glassmorphic UI**: Built with a sleek, dark-mode-first glassmorphic aesthetic using Tailwind CSS, Radix UI primitives, and Remix Icons.

## 🛠 Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) 16 (App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
*   **Database**: [MongoDB](https://www.mongodb.com/) (Native Node Driver & NextAuth Adapter)
*   **Authentication**: [NextAuth.js](https://next-auth.js.org/)
*   **Emails**: [Resend](https://resend.com/) + [React Email](https://react.email/)
*   **Icons**: [Remix Icon](https://remixicon.com/)

## 💻 Local Development

1. **Clone the repository and install dependencies:**
   We recommend using `pnpm` as the package manager.
   ```bash
   pnpm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory and populate it with the following keys:
   ```env
   # Database
   MONGODB_URI="mongodb://localhost:27017/groupify"

   # Authentication
   NEXTAUTH_SECRET="your-super-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   GOOGLE_CLIENT_ID="your-google-oauth-client-id"
   GOOGLE_CLIENT_SECRET="your-google-oauth-secret"

   # Payments
   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="your-paystack-test-key"

   # Emails
   RESEND_API_KEY="re_..."
   EMAIL_FROM="Groupify <noreply@yourdomain.com>"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

3. **Start the development server:**
   ```bash
   pnpm dev
   ```
   The application will be available at [http://localhost:3000](http://localhost:3000).

## 🗄 Project Structure

*   `app/`: Next.js App Router endpoints, pages, and API routes.
    *   `app/api/`: Secure backend API routes for forms, invites, and authentication.
    *   `app/forms/[formId]/admin`: The core administrator dashboard for form management.
*   `components/groupify/`: Reusable UI components, modals, and the form builder.
*   `lib/`: Core utilities including the MongoDB client, Resend initialization, and React Email templates.
*   `public/`: Static assets including the grouping Web Worker script.
*   `scripts/`: Utility scripts (e.g. database migrations).

## 📄 License

This project is private and intended for internal or authorized use only.
