import { GithubIntelligence, DeveloperFingerprint, PlatformComparison } from "../types";
import { levenshtein } from "../analysis/shadowAccountProber";

// Helper to infer language and framework from a repository name or description
function inferTech(name: string, description?: string): { languages: string[]; frameworks: string[] } {
  const text = `${name} ${description || ""}`.toLowerCase();
  const languages: string[] = [];
  const frameworks: string[] = [];

  // Languages
  if (/\b(python|py|django|flask|fastapi|pandas|numpy|pytorch)\b/.test(text)) languages.push("Python");
  if (/\b(javascript|js|typescript|ts|react|nextjs|vue|angular|node|express)\b/.test(text)) languages.push("TypeScript", "JavaScript");
  if (/\b(go|golang)\b/.test(text)) languages.push("Go");
  if (/\b(rust|rs|cargo)\b/.test(text)) languages.push("Rust");
  if (/\b(java|spring|kotlin)\b/.test(text)) languages.push("Java");
  if (/\b(ruby|rails)\b/.test(text)) languages.push("Ruby");
  if (/\b(cpp|c\+\+|clang)\b/.test(text)) languages.push("C++");
  if (/\b(swift|objective-c|cocoa)\b/.test(text)) languages.push("Swift");
  if (/\b(php|laravel)\b/.test(text)) languages.push("PHP");

  // Frameworks
  if (text.includes("react")) frameworks.push("React");
  if (text.includes("nextjs") || text.includes("next.js")) frameworks.push("Next.js");
  if (text.includes("fastapi")) frameworks.push("FastAPI");
  if (text.includes("django")) frameworks.push("Django");
  if (text.includes("vue")) frameworks.push("Vue.js");
  if (text.includes("express")) frameworks.push("Express");
  if (text.includes("spring")) frameworks.push("Spring Boot");
  if (text.includes("laravel")) frameworks.push("Laravel");
  if (text.includes("tailwind")) frameworks.push("TailwindCSS");

  return {
    languages: [...new Set(languages)],
    frameworks: [...new Set(frameworks)]
  };
}

// Helper to categorize a repository
function categorizeRepo(name: string, description?: string): string {
  const text = `${name} ${description || ""}`.toLowerCase();
  if (/\b(ml|ai|deep|learning|neural|tensor|pytorch|gpt|model|nlp)\b/.test(text)) return "Artificial Intelligence / ML";
  if (/\b(web|frontend|backend|api|react|next|django|express|css|html)\b/.test(text)) return "Web Development";
  if (/\b(docker|kubernetes|k8s|ci|cd|action|devops|aws|cloud|terraform)\b/.test(text)) return "DevOps / Cloud";
  if (/\b(blockchain|crypto|solidity|ethereum|btc|eth|smart|contract)\b/.test(text)) return "Blockchain / Web3";
  if (/\b(system|os|kernel|driver|embedded|compiler|rust)\b/.test(text)) return "Systems Programming";
  return "General Utility";
}

export function extractDeveloperFingerprintFromGithub(intel: GithubIntelligence): DeveloperFingerprint {
  const primaryLanguages = [...new Set([
    intel.primaryLanguage || "",
    ...(intel.techStack || [])
  ].filter(Boolean))];

  const frameworksSet = new Set<string>();
  const categoriesMap = new Map<string, number>();

  intel.topRepos.forEach(repo => {
    const { frameworks } = inferTech(repo.name, repo.description || "");
    frameworks.forEach(f => frameworksSet.add(f));
    
    const cat = categorizeRepo(repo.name, repo.description || "");
    categoriesMap.set(cat, (categoriesMap.get(cat) || 0) + 1);
  });

  const repositoryCategories = Array.from(categoriesMap.entries()).map(([category, count]) => ({
    category,
    count
  })).sort((a, b) => b.count - a.count);

  // Classify developer stack
  const stack: string[] = [];
  const langText = primaryLanguages.join(" ").toLowerCase();
  const fwText = Array.from(frameworksSet).join(" ").toLowerCase();

  if (fwText.includes("react") || fwText.includes("vue")) stack.push("Frontend");
  if (fwText.includes("fastapi") || fwText.includes("django") || fwText.includes("express") || langText.includes("go") || langText.includes("rust")) stack.push("Backend");
  if (stack.includes("Frontend") && stack.includes("Backend")) {
    stack.push("Fullstack");
  }
  if (repositoryCategories.some(c => c.category.includes("AI") && c.count > 0)) stack.push("AI / ML Engineer");
  if (repositoryCategories.some(c => c.category.includes("DevOps") && c.count > 0)) stack.push("DevOps");

  if (stack.length === 0) stack.push("General Software Developer");

  const publicRepos = intel.publicRepos || intel.topRepos.length;
  const stars = intel.totalStars || intel.topRepos.reduce((sum, r) => sum + r.stars, 0);
  const forks = intel.totalForks || intel.topRepos.reduce((sum, r) => sum + r.forks, 0);
  
  let activityLevel: "High" | "Medium" | "Low" = "Low";
  if (publicRepos > 15 || stars > 50) activityLevel = "High";
  else if (publicRepos > 5 || stars > 5) activityLevel = "Medium";

  return {
    primaryLanguages: primaryLanguages.slice(0, 5),
    frameworks: Array.from(frameworksSet).slice(0, 5),
    topics: (intel.allTopics || []).slice(0, 8),
    repositoryCategories,
    developerStack: stack,
    ossActivity: {
      stars,
      forks,
      publicRepos,
      activityLevel
    }
  };
}

export function extractDeveloperFingerprintFromGitlab(gitlabAcc: any): DeveloperFingerprint {
  const projects: string[] = gitlabAcc.projects || [];
  const primaryLanguages = new Set<string>();
  const frameworksSet = new Set<string>();
  const categoriesMap = new Map<string, number>();

  projects.forEach((projName: string) => {
    const { languages, frameworks } = inferTech(projName);
    languages.forEach(l => primaryLanguages.add(l));
    frameworks.forEach(f => frameworksSet.add(f));

    const cat = categorizeRepo(projName);
    categoriesMap.set(cat, (categoriesMap.get(cat) || 0) + 1);
  });

  const repositoryCategories = Array.from(categoriesMap.entries()).map(([category, count]) => ({
    category,
    count
  })).sort((a, b) => b.count - a.count);

  const stack: string[] = [];
  const fwText = Array.from(frameworksSet).join(" ").toLowerCase();
  if (fwText.includes("react") || fwText.includes("vue")) stack.push("Frontend");
  if (fwText.includes("fastapi") || fwText.includes("django") || fwText.includes("express")) stack.push("Backend");
  if (stack.includes("Frontend") && stack.includes("Backend")) {
    stack.push("Fullstack");
  }
  if (stack.length === 0) stack.push("Software Developer");

  const publicRepos = projects.length;
  let activityLevel: "High" | "Medium" | "Low" = "Low";
  if (publicRepos >= 5) activityLevel = "Medium";
  else if (publicRepos > 0) activityLevel = "Low";

  return {
    primaryLanguages: Array.from(primaryLanguages).slice(0, 5),
    frameworks: Array.from(frameworksSet).slice(0, 5),
    topics: [],
    repositoryCategories,
    developerStack: stack,
    ossActivity: {
      stars: 0, // GitLab API projects limit in basic probe
      forks: 0,
      publicRepos,
      activityLevel
    }
  };
}

export function compareDeveloperProfiles(githubIntel: GithubIntelligence, gitlabAcc: any): PlatformComparison {
  const fingerprintA = extractDeveloperFingerprintFromGithub(githubIntel);
  const fingerprintB = extractDeveloperFingerprintFromGitlab(gitlabAcc);

  const matchingRepos: { name: string; similarity: number }[] = [];
  
  const reposA = githubIntel.topRepos.map(r => r.name.toLowerCase());
  const reposB = (gitlabAcc.projects || []).map((p: string) => p.toLowerCase());

  // Compare repository names
  reposA.forEach(nameA => {
    reposB.forEach((nameB: string) => {
      if (nameA === nameB) {
        matchingRepos.push({ name: nameA, similarity: 100 });
      } else {
        const maxLen = Math.max(nameA.length, nameB.length);
        const dist = levenshtein(nameA, nameB);
        const sim = Math.round((1 - dist / maxLen) * 100);
        if (sim >= 75) {
          matchingRepos.push({ name: `${nameA} ↔ ${nameB}`, similarity: sim });
        }
      }
    });
  });

  // Compare technology stacks
  const techA = new Set([...fingerprintA.primaryLanguages, ...fingerprintA.frameworks]);
  const techB = new Set([...fingerprintB.primaryLanguages, ...fingerprintB.frameworks]);
  const matchingTech = Array.from(techA).filter(t => techB.has(t));

  // Compute overall similarity score
  let similarityPoints = 0;
  
  // 1. Language overlap (max 30 points)
  if (matchingTech.length > 0) {
    similarityPoints += Math.min(30, matchingTech.length * 15);
  }
  
  // 2. Developer stack alignment (max 30 points)
  const stackA = new Set(fingerprintA.developerStack);
  const stackB = new Set(fingerprintB.developerStack);
  const stackOverlap = Array.from(stackA).filter(s => stackB.has(s));
  if (stackOverlap.length > 0) {
    similarityPoints += 30;
  }

  // 3. Matching repositories (max 40 points)
  if (matchingRepos.length > 0) {
    similarityPoints += Math.min(40, matchingRepos.length * 20);
  }

  // Fallback baseline if they are both software developers but no direct matches
  if (similarityPoints === 0 && (techA.size > 0 && techB.size > 0)) {
    similarityPoints = 25;
  }

  const similarity = Math.min(99, Math.max(0, similarityPoints)); // Capped at 99%

  return {
    platformA: "GitHub",
    platformB: "GitLab",
    fingerprintA,
    fingerprintB,
    similarity,
    matchingRepos,
    matchingTech
  };
}
