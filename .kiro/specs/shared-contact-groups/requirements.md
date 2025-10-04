# Requirements Document

## Introduction

The Shared Contact Groups feature enables event hosts and group organizers to create managed contact lists where participants can opt-in to share their contact information with other group members. This solves the common problem of collecting and distributing contact information for events like weddings, parties, school clubs, and work gatherings, eliminating the manual process of exchanging phone numbers and creating group messaging threads.

## Requirements

### Requirement 1

**User Story:** As an event host or group owner, I want to create a managed contact group with a shareable form, so that participants can easily join and share their contact information.

#### Acceptance Criteria

1. WHEN a host creates a new contact group THEN the system SHALL generate a unique group with a name, description, and shareable URL
2. WHEN a host creates a group THEN the system SHALL provide both a standalone form URL and an embeddable form option
3. WHEN a host accesses their group THEN the system SHALL display all current members and their contact information
4. IF a host owns a group THEN the system SHALL allow them to modify group settings and member list

### Requirement 2

**User Story:** As a participant, I want to join a contact group and share my information, so that other group members can easily contact me.

#### Acceptance Criteria

1. WHEN a participant accesses a group form THEN the system SHALL display the group name, description, and opt-in options
2. WHEN a participant submits their contact information THEN the system SHALL store their details and add them to the group
3. WHEN a participant joins a group THEN the system SHALL NOT notify existing members by default to reduce notification fatigue
4. IF a participant opts-in to membership notifications THEN the system SHALL notify them when new members join or leave the group
5. IF a participant has an account THEN the system SHALL allow them to update their information across all groups

### Requirement 3

**User Story:** As a group member, I want to access other members' contact information, so that I can connect with them directly.

#### Acceptance Criteria

1. WHEN a member accesses the group THEN the system SHALL display all opted-in members' contact information
2. WHEN a member views contact information THEN the system SHALL provide options to download individual contacts or the entire group
3. WHEN the group membership changes AND a member has opted-in to notifications THEN the system SHALL notify them of additions or removals
4. IF a member downloads contacts THEN the system SHALL provide the information in a standard format (vCard/VCF)

### Requirement 4

**User Story:** As a group owner, I want to manage my group over time, so that I can control membership and group lifecycle.

#### Acceptance Criteria

1. WHEN a host wants to remove a member THEN the system SHALL remove them from the group and notify only members who opted-in to notifications
2. WHEN a host closes a group THEN the system SHALL notify all members and optionally provide final contact export
3. WHEN a host modifies group settings THEN the system SHALL update the group information and notify members if necessary
4. IF a group is closed THEN the system SHALL prevent new members from joining

### Requirement 5

**User Story:** As a user, I want to create a secure account with shop-style login and 2FA, so that I can quickly use my saved information across multiple group invitations.

#### Acceptance Criteria

1. WHEN a user creates an account THEN the system SHALL require email verification and optional phone number for 2FA
2. WHEN a user enables 2FA THEN the system SHALL support SMS-based two-factor authentication
3. WHEN a user with an account joins a new group THEN the system SHALL pre-fill their information from their profile
4. WHEN a user updates their account information THEN the system SHALL update their details across all active groups
5. WHEN a user accesses their account THEN the system SHALL display all groups they belong to with quick-access login
6. WHEN a user logs in THEN the system SHALL provide a streamlined, shop-style authentication experience

### Requirement 6

**User Story:** As a group owner, I want to embed the contact form on my existing website, so that participants can join without leaving my event page.

#### Acceptance Criteria

1. WHEN a host requests an embed code THEN the system SHALL provide HTML/JavaScript code for embedding
2. WHEN the embedded form is displayed THEN the system SHALL maintain consistent styling and functionality
3. WHEN a user submits the embedded form THEN the system SHALL process the submission identically to the standalone form
4. IF the embedded form encounters errors THEN the system SHALL display appropriate error messages within the embed

### Requirement 7

**User Story:** As an event host or group owner, I want to mark a group as closed and automatically distribute all contact information to members, so that everyone receives the complete contact list at the optimal time before the event.

#### Acceptance Criteria

1. WHEN a host marks a group as closed THEN the system SHALL prevent new members from joining
2. WHEN a host closes a group THEN the system SHALL automatically send all group members a downloadable file containing everyone's contact information
3. WHEN a group is closed THEN the system SHALL notify all members that the group is now closed and provide the contact export
4. IF a group is closed THEN the system SHALL maintain the contact information for existing members to access but prevent modifications

### Requirement 8

**User Story:** As a group owner or member, I want to receive important notifications via SMS/MMS from the service, so that I stay informed about group activities even when not actively using the app.

#### Acceptance Criteria

1. WHEN the system sends notifications THEN it SHALL use Twilio MMS via toll-free number or A2P 10DLC for brand messaging
2. WHEN a group is closed THEN the system SHALL send MMS notifications to all members with download links for contact information
3. WHEN a user opts-in to notifications THEN the system SHALL send SMS alerts for new member additions or removals
4. WHEN a group owner performs critical actions THEN the system SHALL send confirmation SMS messages
5. IF a user provides a phone number THEN the system SHALL verify it before enabling SMS notifications
6. WHEN sending MMS THEN the system SHALL include branded messaging and clear call-to-action links

### Requirement 9

**User Story:** As a system administrator, I want to ensure user privacy and data protection, so that participants feel safe sharing their contact information.

#### Acceptance Criteria

1. WHEN a user shares contact information THEN the system SHALL only make it available to other group members
2. WHEN a user leaves a group THEN the system SHALL remove their information from other members' access
3. WHEN a group is deleted THEN the system SHALL remove all associated contact data
4. IF a user requests data deletion THEN the system SHALL remove their information from all groups and the system