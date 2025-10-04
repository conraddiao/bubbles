# Shared Contact Groups

A web application for creating and managing shared contact lists for events, gatherings, and group activities. Built with Next.js 14, Supabase, and shadcn/ui.

## Features

- Create and manage contact groups for events
- Shareable forms for participants to join groups
- Contact export in vCard/VCF format
- SMS/MMS notifications via Twilio
- Two-factor authentication
- Embeddable forms for external websites
- Real-time updates with Supabase

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript and App Router
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **UI Components**: shadcn/ui with Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form with Zod validation
- **SMS/MMS**: Twilio integration
- **Authentication**: Supabase Auth with 2FA

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Twilio account (for SMS/MMS features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd shared-contact-groups
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:
- Supabase project URL and keys
- Twilio credentials
- NextAuth secret

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Database Setup

The application requires the following Supabase database tables:
- `profiles` - User profiles extending Supabase auth
- `contact_groups` - Group information and settings
- `group_memberships` - Member relationships and contact info
- `notification_events` - Event tracking for notifications
- `sms_notifications` - SMS/MMS delivery tracking

Refer to the design document for the complete database schema.

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── auth/           # Authentication components
│   ├── groups/         # Group management components
│   ├── forms/          # Form components
│   └── layout/         # Layout components
├── lib/                # Utility functions and configurations
├── providers/          # React context providers
├── types/              # TypeScript type definitions
└── hooks/              # Custom React hooks

```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Environment Variables

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_MESSAGING_SERVICE_SID=your_twilio_messaging_service_sid

# App
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
