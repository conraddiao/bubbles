# Implementation Plan

- [x] 1. Set up project structure and core dependencies

  - Initialize Next.js 14 project with TypeScript and App Router
  - Install and configure Supabase client, shadcn/ui, React Query, React Hook Form, and Zod
  - Set up Tailwind CSS and shadcn/ui component library
  - Configure environment variables for Supabase and Twilio
  - _Requirements: 1.1, 5.1_

- [x] 2. Implement database schema and Supabase configuration

  - Create Supabase database tables (profiles, contact_groups, group_memberships, notification_events, sms_notifications)
  - Set up Row Level Security (RLS) policies for data access control
  - Configure Supabase Auth with email/password authentication
  - Create database functions for group management operations
  - _Requirements: 1.1, 5.1, 9.1_

- [x] 3. Build authentication system with 2FA
- [x] 3.1 Create shop-style authentication components

  - Build AuthForm component with email/password login and signup
  - Implement user profile creation and management
  - Create protected route wrapper component
  - _Requirements: 5.1, 5.6_

- [x] 3.2 Implement phone verification and 2FA system

  - Build PhoneVerification component for number verification
  - Create TwoFactorSetup component for enabling/disabling 2FA
  - Integrate Twilio SMS for verification codes
  - Add 2FA verification to login flow
  - _Requirements: 5.1, 5.2, 8.5_

- [x] 3.3 Write authentication tests

  - Create unit tests for authentication components
  - Test 2FA flow and phone verification
  - _Requirements: 5.1, 5.2_

- [x] 4. Create core group management functionality
- [x] 4.1 Implement group creation and management

  - Build GroupCreationForm component with validation
  - Create GroupDashboard for group owners
  - Implement group settings and member management
  - Generate unique share tokens for groups
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4.2 Build contact form for participants

  - Create ContactForm component for joining groups
  - Implement form validation with Zod schemas
  - Handle both authenticated and anonymous submissions
  - Pre-fill form data for logged-in users
  - _Requirements: 2.1, 2.2, 5.2, 5.3_

- [x] 4.3 Write group management tests

  - Test group creation and validation
  - Test contact form submission flows
  - _Requirements: 1.1, 2.1_

- [x] 5. Implement member list and contact export functionality
- [x] 5.1 Create member display and management

  - Build MemberList component to display group members
  - Implement member removal functionality for group owners
  - Add real-time updates using Supabase subscriptions
  - _Requirements: 1.3, 3.1, 4.1_

- [x] 5.2 Build contact export system

  - Create ContactExport component for downloading contacts
  - Implement vCard/VCF generation for individual and bulk exports
  - Add download functionality for contact files
  - _Requirements: 3.2, 3.4_

- [ ]\* 5.3 Write member management tests

  - Test member list display and updates
  - Test contact export functionality
  - _Requirements: 3.1, 3.2_

- [ ] 6. Implement Twilio SMS/MMS notification system
- [ ] 6.1 Set up Twilio integration and Edge Functions

  - Create Supabase Edge Function for Twilio SMS/MMS sending
  - Configure A2P 10DLC or toll-free number setup
  - Implement SMS notification logging and status tracking
  - _Requirements: 8.1, 8.6_

- [ ] 6.2 Build notification preference management

  - Create NotificationSettings component for user preferences
  - Implement opt-in/opt-out functionality for SMS notifications
  - Add notification preference storage and retrieval
  - _Requirements: 2.4, 8.3_

- [ ] 6.3 Implement group closure notifications

  - Create group closure functionality with SMS/MMS notifications
  - Send contact export links via MMS to all group members
  - Implement branded messaging with download links
  - _Requirements: 7.2, 7.3, 8.2_

- [ ]\* 6.4 Write notification system tests

  - Test Twilio integration and message sending
  - Test notification preferences and opt-in flows
  - _Requirements: 8.1, 8.3_

- [ ] 7. Create embeddable form functionality
- [ ] 7.1 Build embed generator and form

  - Create EmbedGenerator component for generating embed codes
  - Build standalone embeddable form with minimal styling
  - Implement iframe-based embedding with postMessage communication
  - _Requirements: 6.1, 6.2_

- [ ] 7.2 Handle embedded form submissions

  - Process embedded form submissions identically to standalone forms
  - Implement error handling and user feedback within embeds
  - Add CORS configuration for cross-origin embedding
  - _Requirements: 6.3, 6.4_

- [ ]\* 7.3 Write embed functionality tests

  - Test embed code generation and form rendering
  - Test cross-origin form submissions
  - _Requirements: 6.1, 6.3_

- [ ] 8. Implement user account management
- [ ] 8.1 Create user profile and group overview

  - Build user profile page with contact information management
  - Create dashboard showing all user's groups and memberships
  - Implement profile updates that sync across all groups
  - _Requirements: 5.3, 5.4, 5.5_

- [ ] 8.2 Add data privacy and deletion features

  - Implement user data deletion functionality
  - Create group member removal with data cleanup
  - Add privacy controls and data export options
  - _Requirements: 9.2, 9.3, 9.4_

- [ ]\* 8.3 Write user management tests

  - Test profile management and cross-group updates
  - Test data deletion and privacy features
  - _Requirements: 5.3, 9.2_

- [ ] 9. Polish UI/UX and error handling
- [ ] 9.1 Implement comprehensive error handling

  - Add error boundaries and fallback components
  - Create user-friendly error messages and toast notifications
  - Implement retry logic for failed operations
  - _Requirements: All requirements_

- [ ] 9.2 Add loading states and optimistic updates

  - Implement loading spinners and skeleton components
  - Add optimistic updates for better user experience
  - Create smooth transitions and animations
  - _Requirements: All requirements_

- [ ]\* 9.3 Write integration tests

  - Test complete user journeys end-to-end
  - Test error scenarios and edge cases
  - _Requirements: All requirements_

- [ ] 10. Final integration and deployment preparation
- [ ] 10.1 Connect all components and test complete workflows

  - Wire together all components into complete user flows
  - Test group creation → member joining → contact export workflow
  - Verify SMS notifications work end-to-end with Twilio
  - _Requirements: All requirements_

- [ ] 10.2 Optimize performance and prepare for deployment
  - Implement caching strategies and query optimizations
  - Add bundle analysis and performance monitoring
  - Configure production environment variables and settings
  - _Requirements: All requirements_
