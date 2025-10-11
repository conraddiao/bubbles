'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Users, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { getGroupMembers } from '@/lib/database'
import { toast } from 'sonner'
import { getDisplayName, extractNames } from '@/lib/name-utils'

interface GroupMember {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  notifications_enabled: boolean
  joined_at: string
  is_owner: boolean
}

interface ContactExportProps {
  groupId: string
  groupName: string
}

export function ContactExport({ groupId, groupName }: ContactExportProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const { data: members, isLoading } = useQuery<GroupMember[]>({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const result = await getGroupMembers(groupId)
      if (result.error) {
        throw new Error(result.error)
      }
      return (result.data || []) as GroupMember[]
    },
  })

  // Generate vCard content for a single member
  const generateVCard = (member: GroupMember): string => {
    const { firstName, lastName } = extractNames(member)
    const fullName = getDisplayName(member)
    
    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${fullName}`,
      `N:${lastName};${firstName};;;`,
      `EMAIL:${member.email}`,
    ]

    if (member.phone) {
      vcard.push(`TEL:${member.phone}`)
    }

    // Add organization/note to indicate the group
    vcard.push(`ORG:${groupName} | bubbles.fyi`)
    vcard.push(`NOTE:Member of ${groupName} group from bubbles.fyi`)

    vcard.push('END:VCARD')
    return vcard.join('\r\n')
  }

  // Generate combined vCard content for multiple members
  const generateBulkVCard = (memberList: GroupMember[]): string => {
    return memberList.map(generateVCard).join('\r\n')
  }

  // Download a file with the given content
  const downloadFile = (content: string, filename: string, mimeType: string = 'text/vcard') => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Export individual member contact
  const exportSingleContact = async (member: GroupMember) => {
    try {
      setIsExporting(true)
      const vCardContent = generateVCard(member)
      const { firstName, lastName } = extractNames(member)
      const filename = `${firstName}_${lastName}`.replace(/[^a-zA-Z0-9_]/g, '_') + '.vcf'
      downloadFile(vCardContent, filename)
      toast.success(`Contact exported: ${getDisplayName(member)}`)
    } catch (error) {
      console.error('Failed to export contact:', error)
      toast.error('Failed to export contact')
    } finally {
      setIsExporting(false)
    }
  }

  // Export selected members
  const exportSelectedContacts = async () => {
    if (!members || selectedMembers.length === 0) {
      toast.error('Please select at least one member to export')
      return
    }

    try {
      setIsExporting(true)
      const selectedMemberData = members.filter(member => 
        selectedMembers.includes(member.id)
      )
      
      if (selectedMemberData.length === 1) {
        // Single contact export
        const member = selectedMemberData[0]
        const vCardContent = generateVCard(member)
        const { firstName, lastName } = extractNames(member)
        const filename = `${firstName}_${lastName}`.replace(/[^a-zA-Z0-9_]/g, '_') + '.vcf'
        downloadFile(vCardContent, filename)
        toast.success(`Contact exported: ${getDisplayName(member)}`)
      } else {
        // Bulk export
        const vCardContent = generateBulkVCard(selectedMemberData)
        const filename = `${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_contacts.vcf`
        downloadFile(vCardContent, filename)
        toast.success(`${selectedMemberData.length} contacts exported`)
      }
    } catch (error) {
      console.error('Failed to export contacts:', error)
      toast.error('Failed to export contacts')
    } finally {
      setIsExporting(false)
    }
  }

  // Export all members
  const exportAllContacts = async () => {
    if (!members || members.length === 0) {
      toast.error('No members to export')
      return
    }

    try {
      setIsExporting(true)
      const vCardContent = generateBulkVCard(members)
      const filename = `${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_all_contacts.vcf`
      downloadFile(vCardContent, filename)
      toast.success(`All ${members.length} contacts exported`)
    } catch (error) {
      console.error('Failed to export all contacts:', error)
      toast.error('Failed to export all contacts')
    } finally {
      setIsExporting(false)
    }
  }

  // Toggle member selection
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  // Select/deselect all members
  const toggleSelectAll = () => {
    if (!members) return
    
    if (selectedMembers.length === members.length) {
      setSelectedMembers([])
    } else {
      setSelectedMembers(members.map(member => member.id))
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Export Contacts</CardTitle>
          <CardDescription>Loading members...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!members || members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Export Contacts</CardTitle>
          <CardDescription>No members to export</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No members have joined this group yet.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Export Contacts</CardTitle>
            <CardDescription>
              Download contact information in vCard format (.vcf)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={exportAllContacts}
              disabled={isExporting}
              variant="outline"
              size="sm"
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export All ({members.length})
            </Button>
            {selectedMembers.length > 0 && (
              <Button
                onClick={exportSelectedContacts}
                disabled={isExporting}
                size="sm"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export Selected ({selectedMembers.length})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Select All Checkbox */}
          <div className="flex items-center space-x-2 pb-2 border-b">
            <Checkbox
              id="select-all"
              checked={selectedMembers.length === members.length}
              onCheckedChange={toggleSelectAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Select All Members
            </label>
          </div>

          {/* Member List */}
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id={`member-${member.id}`}
                    checked={selectedMembers.includes(member.id)}
                    onCheckedChange={() => toggleMemberSelection(member.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getDisplayName(member)}</span>
                      {member.is_owner && (
                        <Badge variant="secondary" className="text-xs">
                          Owner
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.email}
                      {member.phone && ` • ${member.phone}`}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportSingleContact(member)}
                  disabled={isExporting}
                  className="shrink-0"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Export Info */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">About vCard Export</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• vCard (.vcf) files can be imported into most contact apps</li>
              <li>• Individual exports create one contact per file</li>
              <li>• Bulk exports combine all contacts into a single file</li>
              <li>• Files include name, email, phone, and group information</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}