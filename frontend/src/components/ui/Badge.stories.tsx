import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './Badge'

const meta: Meta<typeof Badge> = { component: Badge }
export default meta
type Story = StoryObj<typeof Badge>

export const Green:  Story = { args: { variant: 'green',  children: 'In Progress' } }
export const Amber:  Story = { args: { variant: 'amber',  children: 'Pending QC'  } }
export const Red:    Story = { args: { variant: 'red',    children: 'Hold'        } }
export const Blue:   Story = { args: { variant: 'blue',   children: 'Scheduled'   } }
