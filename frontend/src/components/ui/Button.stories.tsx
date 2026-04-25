import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = { component: Button }
export default meta
type Story = StoryObj<typeof Button>

export const Primary:   Story = { args: { variant: 'primary',   children: 'Create Order'    } }
export const Secondary: Story = { args: { variant: 'secondary', children: 'View Details'    } }
export const Ghost:     Story = { args: { variant: 'ghost',     children: 'Cancel'          } }
export const Danger:    Story = { args: { variant: 'danger',    children: 'Delete'          } }
export const Loading:   Story = { args: { variant: 'primary',   children: 'Saving', loading: true } }
