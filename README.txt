================================================================================
                    PROJECT SETUP AND EXECUTION GUIDE
================================================================================

This is a Next.js 15 job portal application built with TypeScript, MongoDB, 
and React. This guide will help you install all prerequisites and execute 
the project step by step.

================================================================================
                            PRE-REQUISITES
================================================================================

Before executing this project, you need to install the following software:

1. NODE.JS (Version 18.0.0 or higher)
   - Download from: https://nodejs.org/
   - Install the LTS (Long Term Support) version
   - Verify installation by running: node --version
   - Verify npm installation by running: npm --version

2. MONGODB (Version 6.0 or higher)
   - Option A: MongoDB Community Server (Local Installation)
     * Download from: https://www.mongodb.com/try/download/community
     * Install MongoDB Community Server
     * Start MongoDB service (varies by OS)
     * Default connection: mongodb://localhost:27017
   
   - Option B: MongoDB Atlas (Cloud - Recommended for beginners)
     * Sign up at: https://www.mongodb.com/cloud/atlas
     * Create a free cluster
     * Get your connection string from Atlas dashboard

3. CODE EDITOR (Optional but recommended)
   - Visual Studio Code: https://code.visualstudio.com/
   - Or any text editor of your choice

4. GIT (Optional - if cloning from repository)
   - Download from: https://git-scm.com/downloads

================================================================================
                    STEP-BY-STEP EXECUTION INSTRUCTIONS
================================================================================

STEP 1: VERIFY PREREQUISITES
----------------------------
Open your terminal/command prompt and verify:

    node --version    (Should show v18.0.0 or higher)
    npm --version     (Should show 9.0.0 or higher)
    mongod --version  (Should show MongoDB version if installed locally)

STEP 2: NAVIGATE TO PROJECT DIRECTORY
--------------------------------------
Open terminal/command prompt and navigate to the project folder:

    cd "C:\Users\Bhavay Gupta\Downloads\mark\ravi1\final1"

    OR if you're already in the project directory, skip this step.

STEP 3: INSTALL PROJECT DEPENDENCIES
-------------------------------------
Install all required npm packages:

    npm install

    OR if you prefer using pnpm:

    pnpm install

    Note: This may take a few minutes depending on your internet speed.
    Wait for the installation to complete successfully.

STEP 4: SET UP ENVIRONMENT VARIABLES
-------------------------------------
Create a file named ".env.local" in the root directory of the project.

For Windows (PowerShell):
    New-Item -Path .env.local -ItemType File

For Windows (Command Prompt):
    type nul > .env.local

For Linux/Mac:
    touch .env.local

Open the ".env.local" file and add the following content:

    MONGODB_URI=mongodb://localhost:27017/project
    JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-123456789

IMPORTANT NOTES:
- If using MongoDB Atlas (cloud), replace MONGODB_URI with your Atlas 
  connection string. Example:
  MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/project

- If MongoDB is running on a different port, update the port number 
  accordingly (default is 27017).

- JWT_SECRET should be a long, random string for security. You can generate 
  one or use the example above for development.

STEP 5: START MONGODB (If using local MongoDB)
-----------------------------------------------
If you installed MongoDB locally, make sure it's running:

For Windows:
    - MongoDB should start automatically as a service
    - Or run: net start MongoDB (in Administrator Command Prompt)
    - Or check Services app and start MongoDB service

For Linux:
    sudo systemctl start mongod

For Mac:
    brew services start mongodb-community

If using MongoDB Atlas (cloud), skip this step.

STEP 6: BUILD THE PROJECT (Optional - for production)
------------------------------------------------------
For development, you can skip this step. For production build:

    npm run build

STEP 7: START THE DEVELOPMENT SERVER
------------------------------------
Run the following command to start the development server:

    npm run dev

    OR

    pnpm dev

You should see output similar to:
    - ready started server on 0.0.0.0:3000, url: http://localhost:3000
    - event compiled client and server successfully

STEP 8: ACCESS THE APPLICATION
-------------------------------
Open your web browser and navigate to:

    http://localhost:3000

The application should now be running!

================================================================================
                        DUMMY USER CREDENTIALS
================================================================================

Since this is a fresh installation, you'll need to register users first. 
However, here are some dummy credentials you can use for testing after 
creating accounts:

NOTE: These credentials are for reference only. You must register users 
through the application's registration page first.

JOB SEEKER ACCOUNT:
-------------------
Username: jobseeker1
Password: Password123!
Email: jobseeker1@example.com
First Name: John
Last Name: Doe

EMPLOYER ACCOUNT:
-----------------
Username: employer1
Password: Password123!
Email: employer1@example.com
Company Name: Tech Solutions Inc.
First Name: Jane
Last Name: Smith

================================================================================
                        REGISTRATION PROCESS
================================================================================

1. Open the application in your browser: http://localhost:3000

2. Click on "Register" or navigate to the registration page

3. Choose your role:
   - Job Seeker: For individuals looking for jobs
   - Employer: For companies posting jobs

4. Fill in the registration form with the dummy credentials above or 
   create your own

5. After successful registration, you can log in with your credentials

================================================================================
                        TROUBLESHOOTING
================================================================================

ISSUE: "MONGODB_URI is not defined"
SOLUTION: Make sure you created the .env.local file in the root directory 
          and added the MONGODB_URI variable.

ISSUE: "Cannot connect to MongoDB"
SOLUTION: 
  - Check if MongoDB is running (for local installation)
  - Verify your MongoDB connection string in .env.local
  - Check if MongoDB port (27017) is not blocked by firewall
  - For Atlas: Verify your IP is whitelisted in Atlas dashboard

ISSUE: "Port 3000 is already in use"
SOLUTION: 
  - Stop any other application using port 3000
  - Or change the port by running: npm run dev -- -p 3001

ISSUE: "Module not found" or "Package not found"
SOLUTION: 
  - Delete node_modules folder
  - Delete package-lock.json (if exists)
  - Run: npm install

ISSUE: "JWT_SECRET not found" warning
SOLUTION: Add JWT_SECRET to your .env.local file. The application will 
          work with a fallback secret, but it's recommended to set your own.

================================================================================
                        PROJECT STRUCTURE
================================================================================

Key directories:
- app/          : Next.js app router pages and API routes
- components/   : React components
- lib/          : Utility functions, database connection, models
- public/       : Static assets (images, etc.)
- styles/       : Global CSS styles

Key files:
- package.json  : Project dependencies and scripts
- next.config.mjs : Next.js configuration
- tsconfig.json : TypeScript configuration
- .env.local    : Environment variables (create this file)

================================================================================
                        AVAILABLE SCRIPTS
================================================================================

npm run dev     : Start development server (http://localhost:3000)
npm run build   : Build the project for production
npm run start   : Start production server (after build)
npm run lint    : Run ESLint to check code quality

================================================================================
                        ADDITIONAL NOTES
================================================================================

- The application uses JWT (JSON Web Tokens) for authentication
- Passwords are hashed using bcrypt before storage
- The database name is set to "project" (can be changed in lib/mongodb.ts)
- The application supports two user roles: job-seeker and employer
- Development server supports hot-reloading (changes reflect automatically)

================================================================================
                        SUPPORT
================================================================================

If you encounter any issues not covered in this guide:
1. Check the console/terminal for error messages
2. Verify all prerequisites are installed correctly
3. Ensure MongoDB is running and accessible
4. Check that all environment variables are set correctly

================================================================================
                        END OF README
================================================================================

