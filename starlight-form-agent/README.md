# Starlight Form Agent

An automated form-filling system using browser agents for social worker workflow modernization. This proof-of-concept demonstrates how browser automation can interact with legacy systems that lack APIs.

## 🌟 Features

### Core Functionality
- **Browser Agent**: Automated navigation and form filling using Playwright
- **Manual Agent Loop**: Custom OpenAI-powered agent loop (no SDK dependencies like LangGraph)
- **Dynamic Form Rendering**: Extracts form structure and renders it on the frontend
- **Carer Management**: Lists and selects foster carers from the legacy system
- **Form Submission**: Submits forms back to the legacy system via browser automation
- **Submission History**: Tracks all form submissions with status

### Technical Highlights
- Built with **Next.js 15** (App Router) + **TypeScript** + **TailwindCSS**
- **Playwright** for reliable browser automation
- **OpenAI GPT-4** for intelligent agent decision making
- Beautiful, modern UI with dark theme and gradient accents

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API Key
- Portal credentials (provided in assessment)

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <repository-url>
cd starlight-form-agent
```

### 2. Install dependencies
```bash
npm install
```

### 3. Install Playwright browsers
```bash
npx playwright install chromium
```

### 4. Set up environment variables
```bash
cp env.example .env.local
```

Edit `.env.local` with your credentials:
```env
OPENAI_API_KEY=your_openai_api_key_here
PORTAL_URL=https://fostering.starlight.inc/starlightdemo/#/login/1
PORTAL_USERNAME=your_username
PORTAL_PASSWORD=your_password
PORTAL_SECURITY_ANSWER=your_security_answer
```

### 5. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
starlight-form-agent/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agent/          # OpenAI agent loop API
│   │   │   ├── carers/         # Carer list API
│   │   │   ├── form-structure/ # Form extraction API
│   │   │   └── submit-form/    # Form submission API
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main page
│   ├── components/
│   │   ├── CarerSelector.tsx   # Carer selection component
│   │   ├── DynamicForm.tsx     # Dynamic form renderer
│   │   └── SubmissionHistory.tsx
│   ├── lib/
│   │   ├── agent-loop.ts       # Manual agent loop implementation
│   │   └── browser-agent.ts    # Playwright browser automation
│   └── types/
│       └── index.ts            # TypeScript type definitions
├── env.example                 # Environment variables template
├── package.json
├── tailwind.config.js
└── README.md
```

## 🔧 Architecture

### Manual Agent Loop
The agent loop (`src/lib/agent-loop.ts`) is implemented manually without using any agent SDKs (as per requirements). It:

1. Maintains conversation context with the LLM
2. Parses structured JSON responses for actions
3. Executes browser automation commands
4. Feeds results back to the LLM for next action
5. Continues until task completion

### Browser Agent
The browser agent (`src/lib/browser-agent.ts`) handles:

- Portal login with credentials and security questions
- Navigation through the legacy system
- Form field extraction and structure analysis
- Form filling with provided data
- Form submission

### Form Structure
The Supervisory Home Visit form has two sections:

**Section A:**
- Category (dropdown)
- Home Visit Type (dropdown)
- Date of Visit (datetime)
- Home File Seen (checkbox)
- Medication Sheet Checked (checkbox)
- Local Authority Feedback Requested (checkbox)
- Nature of Visit (textarea)
- Attendees Details (textarea)
- Additional Emails (text)

**Section B:**
- Caring for Children (textarea)
- Working as part of a team (textarea)
- Training & Personal Development (textarea)
- Carer Personal Issues (textarea)
- Agency Issues (textarea)
- Safe Environment / Safe Care Issues (textarea)
- Concerns / Allegations / Commendations (textarea)
- Day Care / Respite Training (textarea)
- Supervision sent to Carer? (checkbox)
- Foster Carer Comments (textarea)
- Line Manager's Comments (textarea)

## 📡 API Endpoints

### GET `/api/carers`
Fetches the list of foster carers from the portal.

### GET `/api/form-structure?carerCode=FCC-18`
Extracts the form structure for a specific carer.

### POST `/api/submit-form`
Submits form data to the legacy system.

```json
{
  "carerCode": "FCC-18",
  "formData": {
    "category": "Individual Child",
    "homeVisitType": "Announced",
    "dateOfVisit": "2024-12-11T10:00",
    ...
  },
  "submitType": "draft" | "submit" | "submitAndLock"
}
```

### POST `/api/agent`
Runs the full agent loop with natural language commands.

```json
{
  "message": "Login and get the list of carers",
  "sessionId": "optional_session_id"
}
```

## 🎨 Design Decisions

### UI/UX
- Dark theme with gradient accents for modern feel
- Custom Outfit + Clash Display fonts for typography
- Card-based layout with glassmorphism effects
- Smooth animations and transitions
- Responsive design for all screen sizes

### Architecture
- Server-side browser automation for security
- Session-based agent contexts for multi-step operations
- Mock data fallback when API is unavailable
- Structured error handling throughout

## ⚠️ Assumptions Made

1. **Single Form Focus**: The current implementation focuses on the Supervisory Home Visit form as specified. The bonus task for multiple forms can be extended using the same pattern.

2. **Browser Headless Mode**: Running in headless mode for production. Set `headless: false` in browser-agent.ts for debugging.

3. **Form Structure**: The form structure is pre-defined based on exploration of the legacy system. Dynamic extraction is implemented but may need adjustments for form changes.

4. **Session Management**: Browser sessions are managed server-side. In production, consider using a browser pool for concurrent users.

5. **Error Recovery**: Basic error handling is implemented. Production systems should have more robust retry logic and fallback mechanisms.

## 🚧 Known Limitations

1. **Portal Availability**: The demo portal may have intermittent availability
2. **Captcha Issues**: The StarlightTest portal had reCAPTCHA configuration issues; use the starlightdemo portal instead
3. **Concurrent Users**: Current implementation doesn't support multiple simultaneous browser sessions
4. **Form Validation**: Server-side validation depends on the legacy system's responses

## 📈 Future Improvements

- [ ] Multi-form support (bonus task)
- [ ] Voice recording integration
- [ ] Real-time browser session streaming
- [ ] Webhook notifications for submission status
- [ ] Admin dashboard for monitoring
- [ ] Database persistence for submission history

## 🧪 Testing

```bash
# Run the development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## ✅ TODO - Remaining Tasks

The following items need to be completed:

### High Priority
- [ ] **Fix Core Form Filling Functionality**: The agent loop is implemented but needs to be connected to actually fill form fields in the legacy system. The browser agent has the form filling methods, but the integration with the frontend form data needs to be completed.

### Bonus Tasks
- [ ] **Multi-Form Support**: Extend the system to handle multiple form types beyond the Supervisory Home Visit form (as mentioned in the assessment bonus task).

### Code Quality
- [ ] **Remove CSS Warnings**: Fix vendor-prefixed CSS properties in `globals.css`:
  - Replace `-webkit-background-clip: text` with standard `background-clip: text` (or use both for compatibility)
  - Replace `-webkit-text-fill-color: transparent` with `color: transparent` where applicable
  - These warnings appear in the `.section-title` class around line 191-192
- [ ] **Add Unit Tests**: Implement unit tests for:
  - Browser agent functions
  - Agent loop logic
  - API route handlers
  - Form parsing and validation
- [ ] **Add Linting**: Set up ESLint with proper configuration for:
  - TypeScript support
  - React/Next.js rules
  - Prettier integration for code formatting

### DevOps
- [ ] **Docker Image**: Create a Dockerfile and docker-compose setup for containerized deployment:
  - Multi-stage build for optimized image size
  - Include Playwright browser dependencies
  - Environment variable configuration
  - Health check endpoints

---

## 📄 License

ISC

---



