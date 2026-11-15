/*
  KONTENT — saytdagi barcha matnlarning yagona manbai
  --------------------------------------------------
  Ma'lumotlar asosiy portfolio (yakubbaev.dev) bilan bir xil. Matnni
  o'zgartirish kerak bo'lsa FAQAT shu fayl tahrirlanadi: cardlar (ui.js),
  navigatsiya va 3D shaharcha (town.js) hammasi shu yerdan o'qiydi.
*/

export const PROFILE = {
  name: 'Azamat Yakubbaev',
  role: 'Full-stack developer & mentor',
  location: 'Nukus, Uzbekistan · UTC+5',
  photo: 'assets/portrait.png',
  cv: 'assets/Azamat_Yakubbaev_CV.pdf',
  site: 'https://yakubbaev.dev/',
  email: 'yakubbaevdev@gmail.com',
  telegram: 'https://t.me/yakubbaevdev',
  github: 'https://github.com/onlineazamat',
  linkedin: 'https://linkedin.com/in/onlineazamat',
  intro:
    'I develop ERP systems, Telegram apps and tools for businesses. I also teach frontend and backend development in Nukus.',
  about: [
    'My work combines building software for local businesses with teaching the next group of developers.',
    'Since 2025, I’ve worked on ERP/CRM systems, Telegram bots and Mini Apps, AI integrations and mobile apps. I work across the frontend, backend and deployment.',
    'I use AI coding agents with written specs, architecture rules and tests. Outside client work, I build open source tools and a speech dataset for the Karakalpak language.'
  ],
  proof: [
    { value: '20+', label: 'employees using Ortopromed' },
    { value: '4', label: 'regions connected' },
    { value: '50+', label: 'students mentored' }
  ]
};

export const EXPERIENCE = [
  {
    title: 'Program Coordinator',
    company: 'Wall-E RoboLab',
    employment: 'Full-time',
    period: 'Oct 2026 — Present',
    description:
      'Lead a team of mentors who teach robotics courses to school students. Coordinate with managers and partner companies.'
  },
  {
    title: 'Web Developer & Mentor',
    company: 'Data Live Centre',
    employment: 'Part-time',
    period: 'April 2025 — Present',
    description:
      'Build the frontend and backend of the company’s projects. Mentor students in the frontend and Node.js backend tracks through code reviews and project planning.'
  },
  {
    title: 'Node.js Backend Instructor',
    company: 'Data Live Centre',
    employment: 'Part-time',
    period: 'Oct 2025 — May 2026',
    description:
      'Taught Node.js backend development to 20 students through practical, project-based lessons.'
  },
  {
    title: 'Frontend Mentor',
    company: 'Data Live Centre',
    employment: 'Part-time',
    period: 'March 2025 — Aug 2025',
    description:
      'Officially hired as a frontend mentor after the internship. Taught 30 students in 4 groups the fundamentals and advanced concepts of frontend development through hands-on, real-world projects.'
  },
  {
    title: 'Frontend Mentor',
    company: 'Data Live Centre',
    employment: 'Internship',
    period: 'Feb 2025 — March 2025',
    description: 'Taught frontend development to students: HTML, CSS, JavaScript and React.'
  }
];

export const SKILLS = [
  {
    category: 'Frontend',
    items: ['TypeScript', 'React / Next.js', 'Tailwind CSS', 'shadcn/ui · Ant Design', 'Framer Motion', 'PWA']
  },
  {
    category: 'Backend',
    items: [
      'Node.js · NestJS · Express',
      'Python · FastAPI · Flask',
      'Laravel',
      'PostgreSQL · MySQL',
      'Prisma · TypeORM · Drizzle',
      'REST API · Swagger'
    ]
  },
  {
    category: 'Bots, AI & Mobile',
    items: [
      'Telegram Bots & Mini Apps',
      'Claude Code · Cursor',
      'Gemini API',
      'Kotlin · Jetpack Compose',
      'Docker · Nginx',
      'GitHub Actions · Vercel'
    ]
  }
];

/*
  Uydagi to'rt bo'lim — id'lar main.js dagi qavat userData.id bilan mos.
  `nav` — pastki navigatsiya tugmasidagi qisqa nom.
*/
export const HOUSE_SECTIONS = [
  { id: 'about', nav: 'About' },
  { id: 'experience', nav: 'Experience' },
  { id: 'skills', nav: 'Skills' },
  { id: 'contact', nav: 'Contact' }
];

/*
  LOYIHALAR SHAHARCHASI — har bir yozuv = halqa yo'l bo'yidagi bitta bino.
  Tartib halqa bo'ylab joylashuv tartibi (va tur marshruti).
  `building` — town.js dagi qaysi quruvchi funksiya ishlatilishi.
  `items` bo'lsa, bino bir nechta kichik loyihani birlashtiradi.
*/
export const STATIONS = [
  {
    id: 'ortopromed',
    building: 'office',
    label: 'Ortopromed ERP',
    title: 'Ortopromed ERP/CRM',
    category: 'Business operations',
    status: 'Production',
    outcome: '20+ employees · 4 regions',
    image: 'assets/projects/ortopromed-cover.webp',
    summary:
      'A shared system for a company’s customers, orders, technician field work and reporting, with an offline-capable app for field technicians.',
    notes: [
      {
        label: 'What I built',
        text: 'A NestJS backend with role-based access and a Refine + Ant Design admin dashboard. Field technicians get a PWA that works offline and sends push notifications.'
      },
      { label: 'Shipping', text: 'Deployed through GitHub Actions CI/CD and monitored with Sentry.' },
      { label: 'In use', text: 'More than 20 employees across 4 regions use it every day.' }
    ],
    tech: ['NestJS', 'React', 'PostgreSQL', 'TypeORM', 'Refine', 'PWA', 'GitHub Actions', 'Sentry'],
    links: [{ label: 'Visit product', href: 'https://ortopromed.uz' }]
  },
  {
    id: 'nukus-tools',
    building: 'shop',
    label: 'Nukus Tools',
    title: 'Nukus Tools — Debt Ledger',
    category: 'Telegram Mini App',
    status: 'Production',
    outcome: '6 staff · about 50 customers',
    image: 'assets/projects/nukustools-dark.webp',
    summary: 'A customer debt ledger for a construction materials store, built inside Telegram.',
    notes: [
      { label: 'The problem', text: 'The store tracked customer debts in a paper notebook.' },
      {
        label: 'What I built',
        text: 'A Telegram Mini App with separate access for admins, sellers and customers, invoice photos, reminders and exportable Excel/PDF reports.'
      },
      { label: 'In use', text: 'Six staff members and about 50 customers use the app.' }
    ],
    tech: ['React', 'Telegram Mini App', 'aiogram 3', 'Flask', 'MySQL', 'Docker'],
    links: [{ label: 'Open in Telegram', href: 'https://t.me/magazinqariz_bot' }]
  },
  {
    id: 'sanaq',
    building: 'kiosk',
    label: 'Sanaq POS',
    title: 'Sanaq POS',
    category: 'Retail software',
    status: 'In development',
    outcome: 'Offline-first · multi-tenant',
    image: 'assets/projects/getsanaq.png',
    summary:
      'A point-of-sale SaaS for small grocery stores. The checkout keeps working through power and internet outages and includes a digital customer-credit ledger.',
    notes: [
      { label: 'Cashier', text: 'An offline React PWA for the cashier.' },
      { label: 'Platform', text: 'A NestJS API and a Next.js admin panel.' },
      { label: 'Hardware', text: 'A Go bridge for printers, cash drawers and scales.' }
    ],
    tech: ['NestJS', 'React PWA', 'Next.js', 'Go', 'PostgreSQL RLS', 'Drizzle'],
    links: [{ label: 'Visit website', href: 'https://getsanaq.yakubbaev.dev/' }]
  },
  {
    id: 'docsense',
    building: 'library',
    label: 'DocSense',
    title: 'DocSense — Ask Your PDF',
    category: 'AI · Document Q&A',
    status: 'Open source',
    outcome: 'Runs fully offline',
    image: 'assets/projects/docsense.webp',
    summary:
      'Upload a PDF, ask a question in plain language, and get an answer with the exact source passage highlighted in the document. Works with Uzbek, Russian and English PDFs.',
    notes: [
      {
        label: 'The problem',
        text: 'An AI answer is hard to trust when you can’t see where in the document it came from.'
      },
      {
        label: 'What I built',
        text: 'A retrieval pipeline that makes the model quote the document word for word. PyMuPDF then finds each quote on its page and the viewer highlights it.'
      },
      {
        label: 'Open source',
        text: 'Runs entirely on a local machine through Ollama, with no cloud APIs. The code is public under the MIT license.'
      }
    ],
    tech: ['Python', 'FastAPI', 'Ollama', 'bge-m3', 'Qwen3', 'PyMuPDF', 'PDF.js', 'RAG'],
    links: [{ label: 'View source', href: 'https://github.com/OnlineAzamat/doc-sense' }]
  },
  {
    id: 'dots-and-boxes',
    building: 'arcade',
    label: 'Dots and Boxes',
    title: 'Dots and Boxes — Android Game',
    category: 'Mobile game · AI agents',
    status: 'Production',
    outcome: 'About 17,000 lines of Kotlin',
    image: 'assets/projects/dotsandboxes.png',
    summary:
      'An Android game built end-to-end by AI agents under my direction: I wrote the architecture rules, split the work into small steps, and reviewed every change and its tests.',
    notes: [
      { label: 'Multiplayer', text: 'Offline two-device multiplayer over Google Nearby Connections.' },
      { label: 'Bot', text: 'A hard-difficulty bot based on Monte Carlo Tree Search.' }
    ],
    tech: ['Kotlin', 'Jetpack Compose', 'MVVM', 'Room', 'Nearby Connections', 'MCTS', 'AI agents'],
    links: [{ label: 'Get the game', href: 'https://datalife.uz/games' }]
  },
  {
    id: 'karakalpak-tts',
    building: 'yurt',
    label: 'Karakalpak TTS',
    title: 'Karakalpak TTS Speech Corpus',
    category: 'Speech dataset',
    status: 'In development',
    outcome: 'For the Karakalpak language',
    image: 'assets/projects/tts-audio-record.png',
    summary:
      'Collecting a voice dataset to train a Karakalpak text-to-speech model.',
    notes: [
      {
        label: 'Text pipeline',
        text: 'A Python pipeline turns PDF, DOCX and HTML files into clean, normalized sentences.'
      },
      {
        label: 'Recording',
        text: 'A mobile web app records lossless WAV audio and stores progress in Neon Postgres.'
      }
    ],
    tech: ['Python', 'Vercel Serverless', 'Neon Postgres', 'Telegram Bot API'],
    links: []
  },
  {
    id: 'history-museum',
    building: 'museum',
    label: 'History Museum',
    title: 'State History Museum of Karakalpakstan',
    category: 'My first full project',
    status: 'Archived',
    outcome: '4 languages',
    image: 'assets/projects/historical-museum.webp',
    summary:
      'A multilingual website for the State History Museum of Karakalpakstan, with both frontend and backend built by me.',
    notes: [
      {
        label: '2026 rewrite',
        text: 'I reviewed the weaknesses of the first version and rewrote it in Laravel 12, Inertia.js and React, adding a CMS, an admin panel, a token-secured API and an audit log.'
      }
    ],
    tech: ['React', 'Framer Motion', 'Node.js', 'Express', 'MySQL', 'Laravel', 'Inertia.js'],
    links: []
  },
  {
    id: 'open-source',
    building: 'workshop',
    label: 'Open Source Workshop',
    title: 'Open Source Workshop',
    category: 'Tools & side projects',
    status: 'Open source',
    outcome: '5 smaller projects',
    summary: 'Smaller tools, libraries and games I build and publish outside client work.',
    items: [
      {
        title: 'X-Code — Multiplayer Telegram Game',
        text: 'Turn-based multiplayer Bulls & Cows game with a bluffing mechanic, played entirely inside Telegram.',
        tech: 'TypeScript · grammY · Prisma · PostgreSQL',
        links: [{ label: 'Source', href: 'https://github.com/OnlineAzamat/bulls-and-cows' }]
      },
      {
        title: 'humanize-uz',
        text: 'npm library that formats numbers, dates and other values into human-readable Uzbek.',
        tech: 'TypeScript · npm',
        links: [
          { label: 'npm', href: 'https://www.npmjs.com/package/humanize-uz' },
          { label: 'Source', href: 'https://github.com/OnlineAzamat/humanize-uz' }
        ]
      },
      {
        title: 'MyShot — Linux Screenshot Tool',
        text: 'Lightweight system-tray screenshot utility for Linux (GNOME/Ubuntu) with area selection and arrow, rectangle, marker and text annotations.',
        tech: 'Python · PyQt6',
        image: 'assets/projects/myshot.webp',
        links: [{ label: 'Source', href: 'https://github.com/OnlineAzamat/myshot-linux-app' }]
      },
      {
        title: 'Booklet Printer',
        text: 'Desktop app that prepares PDF documents for booklet (saddle-stitch) printing. Rewritten from Python/Tkinter to Go/Fyne for speed and portability.',
        tech: 'Go · Fyne · pdfcpu',
        image: 'assets/projects/booklet-app.png',
        links: [{ label: 'Source', href: 'https://github.com/OnlineAzamat/booklet-app' }]
      },
      {
        title: 'Aklog — Personal Blog',
        text: 'Full-stack blog platform built with the Next.js 14 App Router, focused on performance and SEO, with content managed through GraphQL (Hygraph).',
        tech: 'Next.js · GraphQL · shadcn/ui · Tailwind CSS',
        image: 'assets/projects/aklog.webp',
        links: [
          { label: 'Visit', href: 'https://blog.yakubbaev.dev' },
          { label: 'Source', href: 'https://github.com/OnlineAzamat/blog-app' }
        ]
      }
    ]
  }
];

/*
  Maxfiy topilmalar — uchar chiroq hovlidagi yashirin nuqtalarda ochadi.
  id'lar controllableOrb.js dagi HOTSPOT_DEFS bilan mos.
*/
export const SECRETS = [
  {
    id: 'numbers',
    title: 'By the numbers',
    stats: PROFILE.proof
  },
  {
    id: 'agents',
    title: 'How I work with AI agents',
    text: 'I use AI coding agents with written specs, architecture rules and tests. Dots and Boxes was built that way end-to-end: about 17,000 lines of Kotlin, with every change and its tests reviewed by me.'
  },
  {
    id: 'fact',
    title: 'Where it started',
    text: 'My first full project was the website of the State History Museum of Karakalpakstan. In 2026 I went back, reviewed its weaknesses and rewrote it from scratch.'
  },
  {
    id: 'cv',
    title: 'Resume',
    text: 'The full resume, one click away.',
    link: { label: 'Download resume (PDF)', href: PROFILE.cv, download: true }
  }
];
