export type ColorToken = {
name: string
token: string
value: string
lightValue: string
role: string
className: string
}

/**
 * Documentation metadata for the design foundation page.
 * The source of truth for the values themselves remains `src/styles/globals.css`.
 */
export const colorTokens: ColorToken[] = [
{
name: 'Midnight',
token: '--cg-midnight',
value: '#101827',
lightValue: '#F6F8FA',
role: 'Primary canvas',
className: 'text-foreground',
},
{
name: 'Navy',
token: '--cg-navy',
value: '#172C40',
lightValue: '#FFFFFF',
role: 'Elevated surfaces',
className: 'text-foreground',
},
{
name: 'Climate cyan',
token: '--cg-cyan',
value: '#35C6D9',
lightValue: '#35C6D9',
role: 'Primary signal',
className: 'text-on-accent',
},
{
name: 'Signal lime',
token: '--cg-lime',
value: '#A3E635',
lightValue: '#A3E635',
role: 'Positive status',
className: 'text-on-accent',
},
{
name: 'Heat orange',
token: '--cg-heat',
value: '#FF9F43',
lightValue: '#FF9F43',
role: 'Attention state',
className: 'text-on-accent',
},
{
name: 'Danger red',
token: '--cg-danger',
value: '#F05D65',
lightValue: '#F05D65',
role: 'Critical state',
className: 'text-on-accent',
},
]
