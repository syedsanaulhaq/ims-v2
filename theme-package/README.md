# 🎨 IMS Theme Package

Complete theme package for the Inventory Management System (IMS) - Professional blue-green/teal design.

## 📁 Package Contents

```
theme-package/
├── src/
│   ├── index.css                    # Main stylesheet with theme variables
│   ├── lib/
│   │   └── utils.ts                 # Utility functions (cn class merger)
│   └── components/
│       └── ui/                      # Complete UI component library (58 components)
├── public/
│   ├── ecp-logo.png                 # Main logo
│   ├── favicon.ico                  # Browser icon
│   └── placeholder.svg              # Placeholder image
├── tailwind.config.ts               # Tailwind CSS configuration
├── components.json                  # Shadcn/UI configuration
└── README.md                        # This file
```

## 🎨 Theme Colors

- **Primary**: #1e293b (Dark slate)
- **Secondary**: #f1f5f9 (Light gray) 
- **Accent**: #0d9488 (Teal)
- **Success**: #059669 (Green)
- **Danger**: #dc2626 (Red)
- **Warning**: #d97706 (Amber)

## 🚀 Installation Steps

### 1. Copy Files to Your Project

```bash
# Copy the entire theme-package contents to your project root
cp -r theme-package/* your-project/
```

### 2. Install Required Dependencies

```bash
npm install clsx tailwind-merge tailwindcss-animate
npm install @tailwindcss/forms @tailwindcss/typography
npm install @radix-ui/react-slot @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu @radix-ui/react-label
npm install @radix-ui/react-popover @radix-ui/react-select
npm install @radix-ui/react-separator @radix-ui/react-switch
npm install @radix-ui/react-tabs @radix-ui/react-toast
npm install @radix-ui/react-tooltip @radix-ui/react-accordion
npm install lucide-react
npm install date-fns
npm install react-hook-form @hookform/resolvers zod
```

### 3. Update Your Main Files

**In your main CSS file (index.css):**
```css
@import './src/index.css';
```

**In your main component:**
```tsx
import { cn } from "./lib/utils"
import "./index.css"
```

### 4. Configure Path Aliases (if using Vite/TypeScript)

**vite.config.ts:**
```ts
import path from "path"
import { defineConfig } from "vite"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## 🧩 Using Components

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Professional IMS Design</CardTitle>
      </CardHeader>
      <CardContent>
        <Button className="mr-2">Primary Action</Button>
        <Badge variant="success">Active</Badge>
      </CardContent>
    </Card>
  )
}
```

## 📱 Features

- ✅ **Dark/Light Mode Support**
- ✅ **Responsive Design**
- ✅ **58 Pre-built Components**
- ✅ **Professional Color Scheme**
- ✅ **Modern Animations**
- ✅ **Accessibility Compliant**
- ✅ **TypeScript Support**
- ✅ **Tailwind CSS Integration**

## 🎯 Key Components Included

- **Buttons** - Various styles and sizes
- **Cards** - Content containers
- **Tables** - Data display
- **Forms** - Inputs, selects, textareas
- **Navigation** - Sidebar, breadcrumbs
- **Feedback** - Alerts, toasts, badges
- **Overlays** - Modals, dialogs, popovers
- **Data Display** - Charts, progress bars
- **Layout** - Grids, separators, scrollable areas

## 📄 License

This theme package is extracted from the Inventory Management System project and can be used in your other projects.

## 🔧 Customization

All theme colors are defined as CSS variables in `src/index.css`. You can easily customize:

```css
:root {
  --primary: 222.2 47.4% 11.2%;          /* Change primary color */
  --secondary: 210 40% 96.1%;            /* Change secondary color */
  --accent: 180 100% 32%;                /* Change accent color */
  /* ... other variables */
}
```

## 📞 Support

If you need help implementing this theme, refer to the original IMS project structure or check the Shadcn/UI documentation.