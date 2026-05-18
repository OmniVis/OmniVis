# 🗄️ Repository Information: Slidi

This document contains essential information regarding the source code repository for **Slidi**, the AI-powered interactive presentation generator.

## 🔗 Repository Links

* **Web View:** [GitLab Repository (Adesso Group)](https://gitlab.adesso-group.com/cdfec176/competence-centers/cc_api_management/aitools/slidi)
* **HTTPS URL:** `https://gitlab.adesso-group.com/cdfec176/competence-centers/cc_api_management/aitools/slidi.git`
* **SSH URL:** `git@gitlab.adesso-group.com:cdfec176/competence-centers/cc_api_management/aitools/slidi.git`

---

## 🚀 Pushing your Local Project to `main`

Since you are likely building the Next.js app locally from scratch first, here is how you connect your local code to this GitLab repository and push your initial build directly to the `main` branch:

1. **Initialize Git (if not already done by `create-next-app`):**

```bash
   git init
   git branch -M main
```

2. **Stage and commit your files:**
```bash
   git add .
   git commit -m "Initial commit: Slidi Next.js scaffolding and project plans"
```

3. **Link your local repository to the GitLab remote:**
Choose either SSH (recommended) or HTTPS:
```bash
   # Using SSH
   git remote add origin git@gitlab.adesso-group.com:cdfec176/competence-centers/cc_api_management/aitools/slidi.git

   # OR using HTTPS
   git remote add origin [https://gitlab.adesso-group.com/cdfec176/competence-centers/cc_api_management/aitools/slidi.git](https://gitlab.adesso-group.com/cdfec176/competence-centers/cc_api_management/aitools/slidi.git)
```

4. **Push directly to the main branch:**
```bash
   git push -u origin main
```

---

## 🌿 Branching Strategy (Post-Launch)

Once your initial code is safely on `main`, it is standard practice to switch to a feature-branching workflow for future updates:

* **`main`**: The default, production-ready branch. Code here should always be stable.
* **`feature/*`**: For new features (e.g., `feature/sandpack-integration`).
* **`bugfix/*`**: For resolving bugs (e.g., `bugfix/localstorage-sync`).

### Standard Update Workflow:
1. Make sure you are on main and updated: `git checkout main && git pull`
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Description of changes"`
4. Push to GitLab: `git push origin feature/your-feature-name`
5. Open a **Merge Request (MR)** targeting the `main` branch in GitLab.

---

## 🏢 Organizational Context

This project is maintained within the **Adesso Group**. 
* **Department/Unit:** Competence Center API Management (`cc_api_management`)
* **Category:** AI Tools (`aitools`)