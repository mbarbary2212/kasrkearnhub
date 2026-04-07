import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SectionBlueprintConfig {
  section_id: string;
  section_name: string;
  component_type: string;
  inclusion_level: "high" | "average" | "low" | null;
  question_types: string[];
}

export interface BlueprintContext {
  configs: SectionBlueprintConfig[];
  distribution_instruction: string;
}

const WEIGHT_MAP: Record<string, number> = {
  high: 3,
  average: 2,
  low: 1,
};

export async function getBlueprintContext(
  client: SupabaseClient,
  chapterId: string
): Promise<BlueprintContext> {
  const { data: rawConfigs, error } = await client
    .from("chapter_blueprint_config")
    .select("section_id, component_type, inclusion_level, question_types")
    .eq("chapter_id", chapterId);

  if (error || !rawConfigs || rawConfigs.length === 0) {
    // No blueprint — fetch actual sections so AI can intelligently weight them
    let sectionList = "";
    if (chapterId) {
      const { data: sections } = await client
        .from("sections")
        .select("name, section_number")
        .eq("chapter_id", chapterId)
        .order("display_order");
      if (sections && sections.length > 0) {
        sectionList = "\n\nSections in this chapter:\n" +
          sections.map((s: any) => `- ${s.section_number ? s.section_number + '. ' : ''}${s.name}`).join("\n");
      }
    }

    return {
      configs: [],
      distribution_instruction: `CONTENT DISTRIBUTION (no admin blueprint configured — use your own clinical judgment):
No admin-defined blueprint exists for this chapter. You MUST evaluate each section's importance and distribute items proportionally. DO NOT treat all sections equally.${sectionList}

Weighting rules:
- Core clinical sections (pathophysiology, signs & symptoms, diagnosis, management, complications) → HIGH weight, generate more items
- Moderate sections (epidemiology, risk factors, investigations, prognosis) → MEDIUM weight
- Low-yield sections (introduction, history, definitions, summary) → LOW weight, generate fewer items
- Weight toward sections most likely to appear in medical exams
- Vary difficulty: harder questions for high-weight sections, basic recall for low-weight ones`
    };
  }

  // Collect unique section IDs
  const sectionIds = [
    ...new Set(
      rawConfigs
        .map((c: any) => c.section_id)
        .filter((id: string | null): id is string => !!id)
    ),
  ];

  // Fetch section names
  let sectionNameMap: Record<string, string> = {};
  if (sectionIds.length > 0) {
    const { data: sections } = await client
      .from("sections")
      .select("id, name")
      .in("id", sectionIds);
    if (sections) {
      for (const s of sections) {
        sectionNameMap[s.id] = s.name;
      }
    }
  }

  // Build configs
  const configs: SectionBlueprintConfig[] = rawConfigs.map((c: any) => ({
    section_id: c.section_id || "",
    section_name: c.section_id ? sectionNameMap[c.section_id] || "Unknown" : "Chapter-level",
    component_type: c.component_type,
    inclusion_level: c.inclusion_level || null,
    question_types: c.question_types || [],
  }));

  // Build distribution instruction grouped by section
  const sectionMap = new Map<
    string,
    { name: string; maxWeight: number; level: string; types: Set<string> }
  >();

  for (const cfg of configs) {
    const key = cfg.section_id || "__chapter__";
    const existing = sectionMap.get(key);
    const weight = WEIGHT_MAP[cfg.inclusion_level || ""] || 1;

    if (!existing) {
      sectionMap.set(key, {
        name: cfg.section_name,
        maxWeight: weight,
        level: cfg.inclusion_level || "untagged",
        types: new Set(cfg.question_types),
      });
    } else {
      if (weight > existing.maxWeight) {
        existing.maxWeight = weight;
        existing.level = cfg.inclusion_level || "untagged";
      }
      for (const t of cfg.question_types) {
        existing.types.add(t);
      }
    }
  }

  const totalWeight = Array.from(sectionMap.values()).reduce(
    (sum, s) => sum + s.maxWeight,
    0
  );

  const lines: string[] = [];
  const allTypes = new Set<string>();

  for (const [, section] of sectionMap) {
    const pct = totalWeight > 0 ? Math.round((section.maxWeight / totalWeight) * 100) : 0;
    const typesArr = Array.from(section.types);
    typesArr.forEach((t) => allTypes.add(t));

    let line = `- Section "${section.name}": ${section.level.toUpperCase()} importance → ~${pct}% of items`;
    if (typesArr.length > 0) {
      line += ` [formats: ${typesArr.join(", ")}]`;
    }
    lines.push(line);
  }

  let instruction = `CONTENT DISTRIBUTION (from curriculum blueprint):\n${lines.join("\n")}`;

  if (allTypes.size > 0) {
    instruction += `\n\nPRESCRIBED QUESTION FORMATS for this chapter:\nFocus generation on these types when applicable: ${Array.from(allTypes).join(", ")}\n(If no blueprint types are set for a section, use any appropriate format)`;
  }

  return { configs, distribution_instruction: instruction };
}
