# Words on Phone - Project Structure

## Directory Layout

This project has a **nested structure** that can cause confusion. Here's how it's organized:

```
words-on-phone/                    # Root project directory
├── docs/                          # Project documentation & implementation plans
├── .github/                       # GitHub Actions & workflows
├── package.json                   # ROOT package.json (minimal stub)
├── node_modules/                  # ROOT dependencies (minimal)
└── words-on-phone-app/            # ⭐ ACTUAL REACT APP LIVES HERE
    ├── src/                       # React app source code
    ├── public/                    # Static assets
    ├── dist/                      # Production build output
    ├── ios/                       # Capacitor iOS project
    ├── cypress/                   # E2E tests
    ├── package.json               # ⭐ MAIN package.json with all dependencies
    ├── vite.config.ts             # Vite configuration
    ├── node_modules/              # ⭐ MAIN dependencies
    └── ...                        # All other React app files
```

## ⚠️ Important: Server & Command Execution

### ✅ CORRECT Way to Run Commands

**Always run development and build commands from the `words-on-phone-app/` directory:**

```bash
# Navigate to the app directory
cd words-on-phone-app/

# Run development server
npm run dev          # Serves on http://localhost:5173/

# Build production version
npm run build

# Run production preview
npm run preview      # Serves on http://localhost:4173/

# Run tests
npm test

# Run Cypress tests
npx cypress run
```

### ❌ WRONG Way (Causes 404 Errors)

**Do NOT run commands from the root `words-on-phone/` directory:**

```bash
# DON'T DO THIS - from root directory
cd words-on-phone/
npm run dev          # ❌ Serves wrong directory, causes 404s
```

## Why This Structure Exists

1. **Root Directory**: Contains project documentation, GitHub workflows, and high-level project management files
2. **words-on-phone-app/**: Contains the actual React application with all dependencies and configuration
3. **Root package.json**: Just a minimal stub with basic scripts for project-level operations

## Troubleshooting Server Issues

If you get 404 errors or servers running on wrong ports:

1. **Kill all vite processes**: `pkill -f vite`
2. **Navigate to correct directory**: `cd words-on-phone-app/`
3. **Start fresh server**: `npm run dev`

## Development Workflow

1. Clone the repository
2. **Navigate to the app directory**: `cd words-on-phone-app/`
3. Install dependencies: `npm install`
4. Start development: `npm run dev`
5. Build for production: `npm run build`
6. Test production build: `npm run preview`

## Cypress Testing

All tests must be run from the `words-on-phone-app/` directory:

```bash
cd words-on-phone-app/
npx cypress run                    # Headless testing
npx cypress open                   # Interactive testing
npx cypress run --spec "cypress/e2e/accessibility.cy.ts"  # Specific test
```

## Key Files Locations

- **Main app**: `words-on-phone-app/src/`
- **Vite config**: `words-on-phone-app/vite.config.ts`
- **Dependencies**: `words-on-phone-app/package.json`
- **Build output**: `words-on-phone-app/dist/`
- **iOS project**: `words-on-phone-app/ios/`
- **Documentation**: `docs/` 