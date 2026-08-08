import { prisma } from "../../src/app/lib/prisma";

const categories = [
  { name: "Notes", slug: "notes", icon: "note", description: "Course notes and study materials" },
  { name: "Past Papers", slug: "past-papers", icon: "file-text", description: "Previous exam papers and solutions" },
  { name: "Books & Textbooks", slug: "books", icon: "book", description: "Textbooks and reference books" },
  { name: "Slides & Presentations", slug: "slides", icon: "presentation", description: "Lecture slides and presentations" },
  { name: "Code & Projects", slug: "code", icon: "code", description: "Source code, project files, and templates" },
  { name: "Videos & Tutorials", slug: "videos", icon: "video", description: "Video tutorials and lecture recordings" },
  { name: "Tools & Software", slug: "tools", icon: "tool", description: "Useful software tools and utilities" },
  { name: "Other", slug: "other", icon: "more-horizontal", description: "Other miscellaneous resources" },
  { name: "Lab Manuals", slug: "labs", icon: "flask-conical", description: "Lab manuals, assignments, and lab reports" },
  { name: "Internships & Jobs", slug: "internships", icon: "briefcase", description: "Internship and job opportunities, notices, and career resources" },
  { name: "Research & Journals", slug: "research", icon: "graduation-cap", description: "Research papers, journals, and thesis references" },
  { name: "Competitive Programming", slug: "competitive-programming", icon: "trophy", description: "Contest problems, online judges, and programming practice" },
  { name: "Templates", slug: "templates", icon: "layout-template", description: "CV, cover letter, report, and project templates" },
  { name: "Events & Workshops", slug: "events", icon: "calendar", description: "Workshops, seminars, and campus event resources" },
];

const resources = [
  // ============================= NOTES =============================
  {
    title: "MIT 6.006 Lecture Notes - Introduction to Algorithms",
    description: "Full lecture notes for MIT 6.006 covering algorithmic thinking, sorting, hashing, balanced search trees, shortest paths, dynamic programming, and NP-hardness.",
    fileUrl: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/lecture-notes/",
    fileType: "text/html",
    fileSize: 180000,
    courseCode: "CSE-2263",
    categorySlug: "notes",
    tagSlugs: ["dsa", "algorithms", "data-structures", "sorting", "graph"],
  },
  {
    title: "MIT 6.042J Lecture Notes - Mathematics for Computer Science",
    description: "Lecture notes for MIT 6.042J covering proofs, induction, number theory, counting, recurrences, probability, and graph theory - the core discrete mathematics topics.",
    fileUrl: "https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2005/pages/lecture-notes/",
    fileType: "text/html",
    fileSize: 160000,
    courseCode: "CSE-1211",
    categorySlug: "notes",
    tagSlugs: ["algorithms"],
  },
  {
    title: "Berkeley CS186 Course Notes - Database Systems",
    description: "Topic-by-topic notes for the Berkeley CS186 database course: relational model, SQL, indexing, B+ trees, joins, query optimization, transactions, and recovery.",
    fileUrl: "https://cs186berkeley.net/notes/",
    fileType: "text/html",
    fileSize: 250000,
    courseCode: "CSE-2319",
    categorySlug: "notes",
    tagSlugs: ["dbms", "sql", "normalization", "schema-design"],
  },
  {
    title: "MIT 18.404J Lecture Notes - Theory of Computation",
    description: "Prof. Michael Sipser's MIT lecture notes on regular languages, context-free grammars, Turing machines, decidability, reducibility, and computational complexity.",
    fileUrl: "https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/pages/lecture-notes/",
    fileType: "text/html",
    fileSize: 150000,
    courseCode: "CSE-3169",
    categorySlug: "notes",
    tagSlugs: ["compiler-design"],
  },
  {
    title: "Kurose & Ross Wireshark Labs - Computer Networking",
    description: "Hands-on Wireshark lab exercises (PDF/Word) for HTTP, DNS, TCP, UDP, IP, NAT, Ethernet, DHCP, and more from the Kurose & Ross companion site.",
    fileUrl: "http://www-net.cs.umass.edu/wireshark-labs/",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-4136",
    categorySlug: "notes",
    tagSlugs: ["networking"],
  },
  {
    title: "Mathematics for Computer Science - Free Course Textbook (PDF)",
    description: "The full MIT 6.042 textbook by Lehman, Leighton, and Meyer covering discrete mathematics: proofs, induction, recurrences, counting, probability, and graph theory.",
    fileUrl: "https://courses.csail.mit.edu/6.042/spring18/mcs.pdf",
    fileType: "application/pdf",
    fileSize: 3400000,
    courseCode: "CSE-1211",
    categorySlug: "notes",
    tagSlugs: ["algorithms"],
  },

  // =========================== PAST PAPERS ===========================
  {
    title: "MIT 6.006 Quizzes - Algorithms Exams (Spring 2020)",
    description: "Quiz 1, Quiz 2, and Final Exam PDFs with solutions for MIT 6.006 Introduction to Algorithms.",
    fileUrl: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/quizzes/",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-2263",
    categorySlug: "past-papers",
    tagSlugs: ["dsa", "algorithms"],
  },
  {
    title: "MIT 6.006 Practice Problems - Algorithms (With Solutions)",
    description: "Nine problem sessions with questions and full solutions covering every topic in MIT 6.006 Introduction to Algorithms.",
    fileUrl: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/pages/practice-problems/",
    fileType: "text/html",
    fileSize: 130000,
    courseCode: "CSE-2263",
    categorySlug: "past-papers",
    tagSlugs: ["dsa", "algorithms", "sorting"],
  },
  {
    title: "MIT 6.042J Exams - Mathematics for Computer Science (Fall 2010)",
    description: "Quiz and final exam papers with solutions for MIT 6.042J - excellent discrete mathematics practice.",
    fileUrl: "https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2010/pages/exams/",
    fileType: "text/html",
    fileSize: 110000,
    courseCode: "CSE-1211",
    categorySlug: "past-papers",
    tagSlugs: ["algorithms"],
  },
  {
    title: "MIT 6.042J Exams - Mathematics for Computer Science (Fall 2005)",
    description: "Practice quiz, quizzes, and final exam (with solutions) for MIT 6.042J.",
    fileUrl: "https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-fall-2005/pages/exams/",
    fileType: "text/html",
    fileSize: 110000,
    courseCode: "CSE-1211",
    categorySlug: "past-papers",
    tagSlugs: ["algorithms"],
  },
  {
    title: "Berkeley CS186 Practice Exams - Database Systems",
    description: "Practice midterm 1, midterm 2, and final with solutions for the Berkeley CS186 database course.",
    fileUrl: "https://cs186berkeley.net/fa19/",
    fileType: "text/html",
    fileSize: 140000,
    courseCode: "CSE-2319",
    categorySlug: "past-papers",
    tagSlugs: ["dbms", "sql"],
  },

  // ============================= BOOKS =============================
  {
    title: "Algorithms - Free Textbook by Jeff Erickson",
    description: "A complete, freely available algorithms textbook covering recursion, backtracking, dynamic programming, greedy algorithms, graphs, flows, and NP-hardness.",
    fileUrl: "https://jeffe.cs.illinois.edu/teaching/algorithms/",
    fileType: "text/html",
    fileSize: 200000,
    courseCode: "CSE-2263",
    categorySlug: "books",
    tagSlugs: ["dsa", "algorithms", "dynamic-programming", "graph"],
  },
  {
    title: "Discrete Mathematics: An Open Introduction (3rd Edition)",
    description: "A free open textbook on discrete mathematics covering logic, proofs, sequences, combinatorics, generating functions, and graph theory.",
    fileUrl: "https://discrete.openmathbooks.org/dmoi3.html",
    fileType: "text/html",
    fileSize: 150000,
    courseCode: "CSE-1211",
    categorySlug: "books",
    tagSlugs: ["algorithms"],
  },
  {
    title: "Database System Concepts - Silberschatz, Korth & Sudarshan",
    description: "Official companion site for the classic DBMS textbook, with sample chapters, slides, and supplementary material.",
    fileUrl: "https://www.db-book.com/",
    fileType: "text/html",
    fileSize: 160000,
    courseCode: "CSE-2319",
    categorySlug: "books",
    tagSlugs: ["dbms", "sql"],
  },
  {
    title: "Operating Systems: Three Easy Pieces (OSTEP)",
    description: "The free online OS textbook by Remzi and Andrea Arpaci-Dusseau covering virtualization, concurrency, and persistence.",
    fileUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
    fileType: "text/html",
    fileSize: 220000,
    courseCode: "CSE-3331",
    categorySlug: "books",
    tagSlugs: ["os", "process-scheduling", "memory-management"],
  },
  {
    title: "Computer Networking: A Top-Down Approach - Companion Site",
    description: "Kurose & Ross companion site with book resources, online lectures, slides, and interactive exercises for computer networking.",
    fileUrl: "https://gaia.cs.umass.edu/kurose_ross/",
    fileType: "text/html",
    fileSize: 130000,
    courseCode: "CSE-4136",
    categorySlug: "books",
    tagSlugs: ["networking"],
  },
  {
    title: "Software Engineering (10th Edition) - Ian Sommerville (PDF)",
    description: "Full PDF of Sommerville's Software Engineering textbook covering software processes, agile development, design, testing, and project management.",
    fileUrl: "https://archive.org/download/bme-vik-konyvek/Software%20Engineering%20-%20Ian%20Sommerville.pdf",
    fileType: "application/pdf",
    fileSize: 9500000,
    courseCode: "CSE-3230",
    categorySlug: "books",
    tagSlugs: [],
  },

  // ============================ SLIDES ============================
  {
    title: "Kurose & Ross - Computer Networking Lecture Slides (PPT)",
    description: "Official PowerPoint slides for every chapter of Computer Networking: A Top-Down Approach.",
    fileUrl: "https://gaia.cs.umass.edu/kurose_ross/ppt.php",
    fileType: "text/html",
    fileSize: 110000,
    courseCode: "CSE-4136",
    categorySlug: "slides",
    tagSlugs: ["networking"],
  },
  {
    title: "Berkeley CS186 Lecture Slides - Database Systems (Fall 2019)",
    description: "All lecture slides from the Berkeley CS186 database course: SQL, indexes, joins, transactions, and recovery.",
    fileUrl: "https://cs186berkeley.net/fa19/",
    fileType: "text/html",
    fileSize: 140000,
    courseCode: "CSE-2319",
    categorySlug: "slides",
    tagSlugs: ["dbms", "sql"],
  },
  {
    title: "Ian Sommerville - Software Engineering Presentations",
    description: "Instructor presentations for Ian Sommerville's software engineering courses covering processes, requirements, design, and testing.",
    fileUrl: "https://iansommerville.com/engineering-software-products/presentations/",
    fileType: "text/html",
    fileSize: 100000,
    courseCode: "CSE-3230",
    categorySlug: "slides",
    tagSlugs: [],
  },

  // ========================= CODE & PROJECTS =========================
  {
    title: "TheAlgorithms/Python - 200+ Algorithm Implementations",
    description: "Python implementations of sorting, searching, graphs, dynamic programming, and data structures - ideal for DSA practice.",
    fileUrl: "https://github.com/TheAlgorithms/Python",
    fileType: "text/html",
    fileSize: 200000,
    courseCode: "CSE-2263",
    categorySlug: "code",
    tagSlugs: ["dsa", "python", "algorithms", "sorting", "graph"],
  },
  {
    title: "TheAlgorithms/Java - Algorithm Implementations",
    description: "Java implementations of algorithms and data structures, useful for both algorithms and OOP lab practice.",
    fileUrl: "https://github.com/TheAlgorithms/Java",
    fileType: "text/html",
    fileSize: 200000,
    courseCode: "CSE-3333",
    categorySlug: "code",
    tagSlugs: ["java", "oop", "algorithms"],
  },
  {
    title: "williamfiset/Algorithms - Data Structures & Algorithms (Java)",
    description: "Clean, well-tested Java implementations of AVL trees, heaps, hash tables, graph algorithms, dynamic programming, and more.",
    fileUrl: "https://github.com/williamfiset/Algorithms",
    fileType: "text/html",
    fileSize: 190000,
    courseCode: "CSE-2264",
    categorySlug: "code",
    tagSlugs: ["dsa", "java", "dynamic-programming", "graph"],
  },
  {
    title: "OSTEP Projects - Operating Systems Programming Assignments",
    description: "Real OS course projects: Unix utilities, shell, memory allocator, concurrency, file systems, and xv6 kernel hacking.",
    fileUrl: "https://github.com/remzi-arpacidusseau/ostep-projects",
    fileType: "text/html",
    fileSize: 150000,
    courseCode: "CSE-3373",
    categorySlug: "code",
    tagSlugs: ["os", "linux"],
  },
  {
    title: "Crafting Interpreters - Build a Language in Java & C",
    description: "Complete source code and book text for building the jlox and clox interpreters - excellent for compiler design.",
    fileUrl: "https://github.com/munificent/craftinginterpreters",
    fileType: "text/html",
    fileSize: 180000,
    courseCode: "CSE-3228",
    categorySlug: "code",
    tagSlugs: ["compiler-design", "java"],
  },
  {
    title: "Next.js Official Examples - Web Development Templates",
    description: "Official example apps for Next.js covering routing, API routes, authentication, and full-stack web development.",
    fileUrl: "https://github.com/vercel/next.js/tree/canary/examples",
    fileType: "text/html",
    fileSize: 170000,
    courseCode: "CSE-3292",
    categorySlug: "code",
    tagSlugs: ["web-development", "react", "nodejs", "typescript"],
  },

  // ========================= VIDEOS & TUTORIALS =========================
  {
    title: "MIT 6.006 Algorithms - Full Lecture Videos (YouTube)",
    description: "Complete MIT 6.006 lecture video playlist taught by Prof. Erik Demaine covering the core algorithms curriculum.",
    fileUrl: "https://www.youtube.com/playlist?list=PLUl4u3cNGP63EdVPNLG3ToM6LaEUuStEY",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-2263",
    categorySlug: "videos",
    tagSlugs: ["dsa", "algorithms", "sorting"],
  },
  {
    title: "Neso Academy - Database Management System Video Playlist",
    description: "Complete DBMS video course: ER model, relational algebra, SQL, normalization, transactions, and concurrency control.",
    fileUrl: "https://www.youtube.com/playlist?list=PLBlnK6fEyqRi_CUQ-FXxgzKQ1dwr_ZJWZ",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-2319",
    categorySlug: "videos",
    tagSlugs: ["dbms", "sql"],
  },
  {
    title: "Neso Academy - Discrete Mathematics Video Playlist",
    description: "Complete discrete mathematics video course: propositional logic, set theory, relations, functions, combinatorics, and graph theory.",
    fileUrl: "https://www.youtube.com/playlist?list=PLBlnK6fEyqRhqJPDXcvYlLfXPh37L89g3",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-1211",
    categorySlug: "videos",
    tagSlugs: ["algorithms"],
  },
  {
    title: "Neso Academy - Digital Electronics Video Playlist",
    description: "Complete digital electronics course: number systems, logic gates, Boolean algebra, K-maps, flip-flops, and counters.",
    fileUrl: "https://www.youtube.com/playlist?list=PLBlnK6fEyqRjMH3mWf6kwqiTbT798eAOm",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-2215",
    categorySlug: "videos",
    tagSlugs: [],
  },
  {
    title: "Neso Academy - Operating System Video Playlist",
    description: "Complete OS course: processes, threads, CPU scheduling, deadlocks, memory management, and file systems.",
    fileUrl: "https://www.youtube.com/playlist?list=PLBlnK6fEyqRiVhbXDGLXDk_OQAeuVcp2O",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-3331",
    categorySlug: "videos",
    tagSlugs: ["os", "process-scheduling", "memory-management"],
  },
  {
    title: "Neso Academy - Theory of Computation Video Playlist",
    description: "Complete theory of computation course: finite automata, regular expressions, context-free grammars, pushdown automata, and Turing machines.",
    fileUrl: "https://www.youtube.com/playlist?list=PLBlnK6fEyqRgp46KUv4ZY69yXmpwKOIev",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-3169",
    categorySlug: "videos",
    tagSlugs: ["compiler-design"],
  },
  {
    title: "CS50x - Harvard's Introduction to Computer Science",
    description: "Harvard's free introductory CS course covering C, Python, SQL, algorithms, data structures, and web programming.",
    fileUrl: "https://cs50.harvard.edu/x/",
    fileType: "text/html",
    fileSize: 180000,
    courseCode: "CSE-1111",
    categorySlug: "videos",
    tagSlugs: ["python", "algorithms", "data-structures"],
  },
  {
    title: "Kurose & Ross - Computer Networking Online Lectures",
    description: "Free video lectures for all chapters of Computer Networking: A Top-Down Approach.",
    fileUrl: "https://gaia.cs.umass.edu/kurose_ross/online_lectures.htm",
    fileType: "text/html",
    fileSize: 110000,
    courseCode: "CSE-4136",
    categorySlug: "videos",
    tagSlugs: ["networking"],
  },

  // ========================== TOOLS & SOFTWARE ==========================
  {
    title: "Git - Distributed Version Control",
    description: "Free and open-source version control system used in almost every software project.",
    fileUrl: "https://git-scm.com/",
    fileType: "text/html",
    fileSize: 100000,
    courseCode: "CSE-1112",
    categorySlug: "tools",
    tagSlugs: ["git", "devops"],
  },
  {
    title: "Visual Studio Code - Code Editor & IDE",
    description: "Free, cross-platform code editor with built-in Git, debugging, and extensions for every language.",
    fileUrl: "https://code.visualstudio.com/",
    fileType: "text/html",
    fileSize: 100000,
    courseCode: "CSE-1111",
    categorySlug: "tools",
    tagSlugs: ["web-development", "typescript"],
  },
  {
    title: "Wireshark - Network Protocol Analyzer",
    description: "Industry-standard packet sniffer used in the Computer Networks lab to capture and analyze network traffic.",
    fileUrl: "https://www.wireshark.org/",
    fileType: "text/html",
    fileSize: 100000,
    courseCode: "CSE-4176",
    categorySlug: "tools",
    tagSlugs: ["networking", "cyber-security"],
  },
  {
    title: "Oracle VirtualBox - Virtual Machine Manager",
    description: "Free virtualization software for running Linux and other guest OSes in the Operating Systems lab.",
    fileUrl: "https://www.virtualbox.org/",
    fileType: "text/html",
    fileSize: 100000,
    courseCode: "CSE-3373",
    categorySlug: "tools",
    tagSlugs: ["os", "linux", "devops"],
  },
  {
    title: "MySQL Workbench - Database Design & Administration",
    description: "Visual tool for database design, ER modeling, and SQL development for the DBMS lab.",
    fileUrl: "https://www.mysql.com/products/workbench/",
    fileType: "text/html",
    fileSize: 100000,
    courseCode: "CSE-2367",
    categorySlug: "tools",
    tagSlugs: ["dbms", "sql"],
  },
  {
    title: "Logisim-Evolution - Digital Logic Circuit Simulator",
    description: "Free educational tool for designing and simulating digital logic circuits - essential for the Digital Logic Design lab.",
    fileUrl: "https://github.com/logisim-evolution/logisim-evolution",
    fileType: "text/html",
    fileSize: 150000,
    courseCode: "CSE-2265",
    categorySlug: "tools",
    tagSlugs: [],
  },
  {
    title: "GNU Octave - Numerical Computation Software",
    description: "Free MATLAB-compatible environment for numerical methods: linear algebra, calculus, matrices, and plotting.",
    fileUrl: "https://octave.org/",
    fileType: "text/html",
    fileSize: 100000,
    courseCode: "CSE-3186",
    categorySlug: "tools",
    tagSlugs: ["linear-algebra", "calculus"],
  },
  {
    title: "Docker - Containerization Platform",
    description: "Platform for developing, shipping, and running applications in containers - widely used in web development.",
    fileUrl: "https://www.docker.com/",
    fileType: "text/html",
    fileSize: 100000,
    courseCode: "CSE-3292",
    categorySlug: "tools",
    tagSlugs: ["devops", "cloud-computing"],
  },

  // ============================= OTHER =============================
  {
    title: "Northern University Bangladesh - Official Website",
    description: "Official website of NUB with admission information, academic programs, notices, and campus resources.",
    fileUrl: "https://www.nub.ac.bd/",
    fileType: "text/html",
    fileSize: 150000,
    courseCode: "CSE-1111",
    categorySlug: "other",
    tagSlugs: [],
  },
  {
    title: "NUB Alumni Association",
    description: "Official NUB Alumni Association website with news, events, membership, and networking opportunities.",
    fileUrl: "https://alumni.nub.ac.bd/",
    fileType: "text/html",
    fileSize: 140000,
    courseCode: "CSE-1111",
    categorySlug: "other",
    tagSlugs: [],
  },
  {
    title: "Stack Overflow - Programming Q&A Community",
    description: "The largest programming Q&A community - search it before you ask for help with any coding problem.",
    fileUrl: "https://stackoverflow.com/",
    fileType: "text/html",
    fileSize: 100000,
    courseCode: "CSE-1112",
    categorySlug: "other",
    tagSlugs: ["python", "java", "nodejs", "web-development"],
  },
  {
    title: "IEEE Xplore Digital Library",
    description: "Digital library of IEEE journals, conference papers, and standards - essential for research and final-year projects.",
    fileUrl: "https://ieeexplore.ieee.org/",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-4000",
    categorySlug: "other",
    tagSlugs: ["machine-learning", "artificial-intelligence"],
  },
  {
    title: "Google Scholar - Academic Article Search",
    description: "Free academic search engine for finding scholarly articles, theses, and citations.",
    fileUrl: "https://scholar.google.com/",
    fileType: "text/html",
    fileSize: 100000,
    courseCode: "CSE-4000",
    categorySlug: "other",
    tagSlugs: ["machine-learning", "artificial-intelligence", "data-science"],
  },

  // ============================ LAB MANUALS ============================
  {
    title: "MIT 6.1810 / 6.S081 Operating System Labs (xv6)",
    description: "Official MIT operating systems course labs - system calls, page tables, traps, copy-on-write, locks, and file systems implemented in the xv6 kernel.",
    fileUrl: "https://pdos.csail.mit.edu/6.S081/",
    fileType: "text/html",
    fileSize: 140000,
    courseCode: "CSE-3373",
    categorySlug: "labs",
    tagSlugs: ["os", "linux"],
  },

  // ========================= INTERNSHIPS & JOBS =========================
  {
    title: "LinkedIn - Professional Network & Job Listings",
    description: "Create a professional profile, follow companies, and discover internship and job opportunities.",
    fileUrl: "https://www.linkedin.com/",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-4000",
    categorySlug: "internships",
    tagSlugs: ["business"],
  },
  {
    title: "Indeed - Job & Internship Search",
    description: "Search thousands of job and internship postings and apply directly with your resume.",
    fileUrl: "https://www.indeed.com/",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-4000",
    categorySlug: "internships",
    tagSlugs: ["business"],
  },
  {
    title: "Bdjobs - Bangladesh Job Portal",
    description: "The leading job portal in Bangladesh for internships and entry-level positions.",
    fileUrl: "https://www.bdjobs.com/",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-4000",
    categorySlug: "internships",
    tagSlugs: ["business"],
  },

  // ========================= RESEARCH & JOURNALS =========================
  {
    title: "arXiv - Open Access Preprint Repository",
    description: "Free open-access archive of research papers in computer science, mathematics, and more.",
    fileUrl: "https://arxiv.org/",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-4000",
    categorySlug: "research",
    tagSlugs: ["machine-learning", "artificial-intelligence", "data-science"],
  },
  {
    title: "Semantic Scholar - AI-Powered Academic Search",
    description: "Free academic search engine with AI-powered discovery, citations, and paper recommendations.",
    fileUrl: "https://www.semanticscholar.org/",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-4000",
    categorySlug: "research",
    tagSlugs: ["machine-learning", "data-science"],
  },
  {
    title: "Directory of Open Access Journals (DOAJ)",
    description: "Index of peer-reviewed, open-access journals across all disciplines - useful for research and final-year projects.",
    fileUrl: "https://doaj.org/",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-4000",
    categorySlug: "research",
    tagSlugs: ["machine-learning", "artificial-intelligence"],
  },

  // ===================== COMPETITIVE PROGRAMMING =====================
  {
    title: "Codeforces - Competitive Programming Platform",
    description: "World-class competitive programming contests with a large problem archive for training.",
    fileUrl: "https://codeforces.com/",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-2264",
    categorySlug: "competitive-programming",
    tagSlugs: ["dsa", "algorithms"],
  },
  {
    title: "LeetCode - Interview & DSA Practice",
    description: "Thousands of curated algorithm and data structure problems, perfect for DSA practice and interview prep.",
    fileUrl: "https://leetcode.com/",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-2263",
    categorySlug: "competitive-programming",
    tagSlugs: ["dsa", "algorithms", "data-structures"],
  },
  {
    title: "HackerRank - Coding Challenges & Contests",
    description: "Practice coding challenges in many languages and compete in contests.",
    fileUrl: "https://www.hackerrank.com/",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-2264",
    categorySlug: "competitive-programming",
    tagSlugs: ["dsa", "python"],
  },

  // ============================= TEMPLATES =============================
  {
    title: "Overleaf - Online LaTeX Editor with Templates",
    description: "Collaborative LaTeX editor with thousands of free templates for reports, theses, CVs, and presentations.",
    fileUrl: "https://www.overleaf.com/",
    fileType: "text/html",
    fileSize: 120000,
    courseCode: "CSE-4000",
    categorySlug: "templates",
    tagSlugs: [],
  },
];

export async function seedResourceCategories() {
  for (const category of categories) {
    await prisma.resourceCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }

  console.log(`Seeded ${categories.length} resource categories.`);
}

export async function seedResources() {
  await seedResourceCategories();

  const existingCount = await prisma.resource.count();
  if (existingCount > 0) {
    console.log("Resources already exist. Skipping resource seed.");
    return;
  }

  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!adminUser) {
    console.error("No admin user found. Run core seed first.");
    return;
  }

  for (const resource of resources) {
    const course = await prisma.course.findUnique({
      where: { code: resource.courseCode },
    });

    if (!course) {
      console.warn(`Course ${resource.courseCode} not found. Skipping resource: ${resource.title}`);
      continue;
    }

    const category = await prisma.resourceCategory.findUnique({
      where: { slug: resource.categorySlug },
    });

    if (!category) {
      console.warn(`Category ${resource.categorySlug} not found. Skipping resource: ${resource.title}`);
      continue;
    }

    const slug = resource.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    await prisma.resource.create({
      data: {
        title: resource.title,
        description: resource.description,
        fileUrl: resource.fileUrl,
        fileType: resource.fileType,
        fileSize: resource.fileSize,
        courseId: course.id,
        categoryId: category.id,
        uploaderId: adminUser.id,
        upvoteCount: Math.floor(Math.random() * 20),
        downloadCount: Math.floor(Math.random() * 50),
        viewCount: Math.floor(Math.random() * 200),
        resourceTags: {
          create: (
            await Promise.all(
              resource.tagSlugs.map(async (tagSlug) => {
                const tag = await prisma.tag.findUnique({
                  where: { slug: tagSlug },
                });
                if (!tag) {
                  console.warn(`Tag ${tagSlug} not found.`);
                  return null;
                }
                return { tagId: tag.id };
              }),
            )
          ).filter(Boolean),
        },
      },
    });
  }

  console.log(`Seeded ${resources.length} resources.`);
}
