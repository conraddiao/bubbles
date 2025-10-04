### Shared Contacts for Events

## Problem
- group contact sharing is a pain

## Example
- Wedding: the hosts each have contacts of ~50 of the guests. During the course of a wedding, it’s often very helpful for guests to have the #s of those you’re staying or celebrating with, but it’s a somewhat protracted process to get people’s contact information to everyone and get group / personal MMS threads going.
- Party: same issue — getting #s can be a pain. partiful makes this a bit easier, but you still need to look the person up, introduce yourself in the text, and create a contract for them.
- School club: Even worse than wedding, no shared #s to start.
----
- Work: #s are often in Slack or the HRIS, but again, you still need to look the person up, introduce yourself in the text, and create a contract for them.
    - Slightly different, since an employer will likely want to modify contacts on other’s behalf

## Concept
- Hosted, stateful, importable contact lists

## User Stories
- As a host / group owner
    - I can embed a form on my site where users can add their contact information and opt-in to it being available to others at the wedding.
    - I can point to a hosted form where users can add their contact information and opt-in to it being available to others at the wedding.
    - I can modify the group over time
        - Remove users
            - Send MMS to tell others there have been changes
            - Send MMS to tell others the group is no longer open / managed / etc.
- As a user 
    - I can opt-in to share my contact information
    - I can create an account to modify my information at any time (and use it to quick-fill on other instances of [APP NAME] in the future, a la Shop Pay
    - I can create an account to see my groups

## Flows
- Option 1
    - Owner creates group
        - User 1 joins group
            - Adds contact
        - User 2 joins group
            - Adds contact
            - optionally downloads user 1 contact
            - Other users are notified the group grew, and optionally download
            - Adds contact
            - Optionally download
- Option 2
    - Owner create creates group
        - User 1 joins group (adds contact)
        - User 2 join group 
        - …
    - Owner closes group
        - Owner pushes #s to all

## Alternatives
- iMessage
    - No way to collect #s outside of the Contacts App
- Partiful
    - Doesn’t work offline; doesn’t fit into a zola, withjoy experience
- GroupMe
    - Sucks, poor penetration outside of college
- WhatsApp
    - Poor penetration in US

## Long term risk
- lorem ipsum dolor est...

## Architecture

- Group
    - name
    - created_date
    - description
    - url
    - embed_url
    - owner (User)
    - members (Record[UserId, Users])
    - state

- User
    - contact information
        - last updated
        - version
        - first name
        - middle name
        - last name
        - ...
        - ? (.ics)
    - groups
        - group_id

- getGroup(group_id)
- setGroup()
- getGroupUsers()

- getUser()

- setUser()
- getUserGroups()
- ? createICS()