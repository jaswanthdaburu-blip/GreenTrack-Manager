import { Router, type IRouter } from "express";
import {
  AnalyzeTreeHealthBody,
  AnalyzeTreeHealthResponse,
  ChatWithAiBody,
  ChatWithAiResponse,
  CreateLocationBody,
  CreateLocationResponse,
  CreateMaintenanceBody,
  CreateMaintenanceResponse,
  CreateSpeciesBody,
  CreateSpeciesResponse,
  CreateTreeBody,
  CreateTreeResponse,
  DeleteAlertParams,
  DeleteLocationParams,
  DeleteMaintenanceParams,
  DeleteSpeciesParams,
  DeleteTreeParams,
  GetAiInsightsResponse,
  GetAiRecommendationsResponse,
  GetDashboardStatisticsResponse,
  GetDashboardTrendsResponse,
  GetReportsSummaryResponse,
  GetTreeParams,
  GetTreeResponse,
  ListAlertsResponse,
  ListLocationsResponse,
  ListMaintenanceQueryParams,
  ListMaintenanceResponse,
  ListSpeciesResponse,
  ListTreesQueryParams,
  ListTreesResponse,
  PredictTreeSurvivalBody,
  PredictTreeSurvivalResponse,
  UpdateAlertBody,
  UpdateAlertParams,
  UpdateAlertResponse,
  UpdateLocationBody,
  UpdateLocationParams,
  UpdateLocationResponse,
  UpdateMaintenanceBody,
  UpdateMaintenanceParams,
  UpdateMaintenanceResponse,
  UpdateSpeciesBody,
  UpdateSpeciesParams,
  UpdateSpeciesResponse,
  UpdateTreeBody,
  UpdateTreeParams,
  UpdateTreeResponse,
} from "@workspace/api-zod";
import {
  ApiProblem,
  orgQuery,
  restRequest,
  rows,
  type GreenTrackAuth,
} from "../lib/supabase-rest";
import {
  attachGreenTrackAuth,
  requireGreenTrackAuth,
} from "../middlewares/supabase-auth";

type DbRow = Record<string, unknown>;
type JsonObject = Record<string, unknown>;

const router: IRouter = Router();
const TREE_SELECT =
  "*,species!trees_species_id_fkey(id,species_name,common_name,scientific_name),locations!trees_location_id_fkey(id,label,area,city,latitude,longitude),maintenance(maintenance_date)";

function asRecord(value: unknown): DbRow {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as DbRow)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  const parsed =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function toTree(rowValue: unknown): JsonObject {
  const row = asRecord(rowValue);
  const species = asRecord(row.species);
  const location = asRecord(row.locations);
  const maintenance = Array.isArray(row.maintenance)
    ? row.maintenance.map(asRecord)
    : [];
  const latestMaintenance = maintenance
    .map((entry) => asString(entry.maintenance_date))
    .sort()
    .at(-1);

  return {
    id: row.id,
    treeCode: row.tree_code,
    speciesId: row.species_id,
    speciesName: species.species_name ?? "Unknown species",
    commonName: species.common_name ?? "Unknown species",
    scientificName: species.scientific_name ?? "",
    locationId: row.location_id,
    locationLabel: location.label ?? "Unknown location",
    area: location.area ?? null,
    city: location.city ?? null,
    latitude: asNumber(row.latitude) ?? asNumber(location.latitude),
    longitude: asNumber(row.longitude) ?? asNumber(location.longitude),
    plantingDate: row.planting_date,
    status: row.status,
    healthCondition: row.health_condition,
    imageUrl: row.image_url ?? null,
    notes: row.notes ?? null,
    lastMaintainedAt: latestMaintenance
      ? `${latestMaintenance}T00:00:00.000Z`
      : null,
    survivalProbability: asNumber(row.survival_probability),
    riskLevel: row.risk_level ?? null,
    createdAt: row.created_at,
  };
}

function toSpecies(rowValue: unknown, treeRows: DbRow[] = []): JsonObject {
  const row = asRecord(rowValue);
  const planted = treeRows.filter(
    (tree) => tree.species_id === row.id && tree.status !== "Dead",
  ).length;
  const total = treeRows.filter((tree) => tree.species_id === row.id).length;
  return {
    id: row.id,
    speciesName: row.species_name,
    commonName: row.common_name,
    scientificName: row.scientific_name,
    description: row.description ?? null,
    suitableClimate: row.suitable_climate ?? null,
    waterRequirement: row.water_requirement ?? null,
    growthInformation: row.growth_information ?? null,
    treeCount: total,
    survivalRate: total ? (planted / total) * 100 : null,
  };
}

function toLocation(rowValue: unknown, treeRows: DbRow[] = []): JsonObject {
  const row = asRecord(rowValue);
  const planted = treeRows.filter(
    (tree) => tree.location_id === row.id && tree.status !== "Dead",
  ).length;
  const total = treeRows.filter((tree) => tree.location_id === row.id).length;
  return {
    id: row.id,
    label: row.label,
    address: row.address ?? null,
    area: row.area ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    country: row.country ?? null,
    latitude: asNumber(row.latitude),
    longitude: asNumber(row.longitude),
    treeCount: total,
    survivalRate: total ? (planted / total) * 100 : null,
  };
}

function toMaintenance(rowValue: unknown): JsonObject {
  const row = asRecord(rowValue);
  const tree = asRecord(row.trees);
  const species = asRecord(tree.species);
  const location = asRecord(tree.locations);
  return {
    id: row.id,
    treeId: row.tree_id,
    treeCode: tree.tree_code ?? "Tree",
    speciesName: species.common_name ?? null,
    locationLabel: location.label ?? null,
    maintenanceType: row.maintenance_type,
    maintenanceDate: row.maintenance_date,
    description: row.description ?? null,
    notes: row.notes ?? null,
    staffName: null,
    createdAt: row.created_at,
  };
}

async function rawTrees(auth: GreenTrackAuth): Promise<DbRow[]> {
  const query = orgQuery(auth, TREE_SELECT);
  query.set("order", "created_at.desc");
  return restAllRows(auth, "trees", query);
}

async function rawSpecies(auth: GreenTrackAuth): Promise<DbRow[]> {
  const query = orgQuery(auth, "*");
  query.set("order", "common_name.asc");
  return restAllRows(auth, "species", query);
}

async function rawLocations(auth: GreenTrackAuth): Promise<DbRow[]> {
  const query = orgQuery(auth, "*");
  query.set("order", "label.asc");
  return restAllRows(auth, "locations", query);
}

async function rawMaintenance(auth: GreenTrackAuth): Promise<DbRow[]> {
  const query = orgQuery(
    auth,
    "*,trees(tree_code,species(common_name),locations(label))",
  );
  query.set("order", "maintenance_date.desc");
  return restAllRows(auth, "maintenance", query);
}

async function restAllRows(
  auth: GreenTrackAuth,
  resource: string,
  query: URLSearchParams,
  pageSize = 1000,
): Promise<DbRow[]> {
  const result: DbRow[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const pageQuery = new URLSearchParams(query);
    pageQuery.set("limit", String(pageSize));
    pageQuery.set("offset", String(offset));
    const page = rows(await restRequest<DbRow[]>(auth, resource, pageQuery));
    result.push(...page);
    if (page.length < pageSize) return result;
  }
}

async function treeById(auth: GreenTrackAuth, id: string): Promise<DbRow | null> {
  const query = orgQuery(auth, TREE_SELECT);
  query.set("id", `eq.${id}`);
  query.set("limit", "1");
  const result = rows(await restRequest<DbRow[]>(auth, "trees", query));
  return result[0] ?? null;
}

function toTreePayload(body: Record<string, unknown>): Record<string, unknown> {
  const mapping: Record<string, string> = {
    treeCode: "tree_code",
    speciesId: "species_id",
    locationId: "location_id",
    plantingDate: "planting_date",
    status: "status",
    healthCondition: "health_condition",
    latitude: "latitude",
    longitude: "longitude",
    imageUrl: "image_url",
    notes: "notes",
  };
  const result: Record<string, unknown> = {};
  for (const [key, dbKey] of Object.entries(mapping)) {
    if (Object.hasOwn(body, key)) result[dbKey] = body[key];
  }
  return result;
}

function toSpeciesPayload(body: Record<string, unknown>): Record<string, unknown> {
  const mapping: Record<string, string> = {
    speciesName: "species_name",
    commonName: "common_name",
    scientificName: "scientific_name",
    description: "description",
    suitableClimate: "suitable_climate",
    waterRequirement: "water_requirement",
    growthInformation: "growth_information",
  };
  const result: Record<string, unknown> = {};
  for (const [key, dbKey] of Object.entries(mapping)) {
    if (Object.hasOwn(body, key)) result[dbKey] = body[key];
  }
  return result;
}

function toLocationPayload(body: Record<string, unknown>): Record<string, unknown> {
  const mapping: Record<string, string> = {
    label: "label",
    address: "address",
    area: "area",
    city: "city",
    state: "state",
    country: "country",
    latitude: "latitude",
    longitude: "longitude",
  };
  const result: Record<string, unknown> = {};
  for (const [key, dbKey] of Object.entries(mapping)) {
    if (Object.hasOwn(body, key)) result[dbKey] = body[key];
  }
  return result;
}

function toMaintenancePayload(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const mapping: Record<string, string> = {
    treeId: "tree_id",
    maintenanceType: "maintenance_type",
    maintenanceDate: "maintenance_date",
    description: "description",
    notes: "notes",
  };
  const result: Record<string, unknown> = {};
  for (const [key, dbKey] of Object.entries(mapping)) {
    if (Object.hasOwn(body, key)) result[dbKey] = body[key];
  }
  return result;
}

function queryForId(auth: GreenTrackAuth, id: string, select: string): URLSearchParams {
  const query = orgQuery(auth, select);
  query.set("id", `eq.${id}`);
  return query;
}

function requireRows<T>(value: T[] | null | undefined, label: string): T {
  if (!value?.[0]) throw new ApiProblem(404, `${label} was not found.`);
  return value[0];
}

function buildStatistics(
  treeRows: JsonObject[],
  speciesCount: number,
  locationCount: number,
  alertCount: number,
): JsonObject {
  const total = treeRows.length;
  const living = treeRows.filter((tree) => tree.status !== "Dead").length;
  return {
    totalTrees: total,
    livingTrees: living,
    deadTrees: total - living,
    attentionCount: treeRows.filter(
      (tree) =>
        tree.status === "Needs Attention" ||
        tree.healthCondition === "Poor" ||
        tree.healthCondition === "Critical",
    ).length,
    survivalRate: total ? (living / total) * 100 : 0,
    speciesCount,
    locationCount,
    openAlerts: alertCount,
  };
}

async function dashboardData(auth: GreenTrackAuth): Promise<{
  trees: JsonObject[];
  species: JsonObject[];
  locations: JsonObject[];
  maintenance: JsonObject[];
  alerts: JsonObject[];
  statistics: JsonObject;
}> {
  const [treeRows, speciesRows, locationRows, maintenanceRows, alertRows] =
    await Promise.all([
      rawTrees(auth),
      rawSpecies(auth),
      rawLocations(auth),
      rawMaintenance(auth),
      restAllRows(
        auth,
        "alerts",
        orgQuery(auth, "*"),
      ),
    ]);
  const trees = treeRows.map(toTree);
  const species = speciesRows.map((row) => toSpecies(row, treeRows));
  const locations = locationRows.map((row) => toLocation(row, treeRows));
  const maintenance = maintenanceRows.map(toMaintenance);
  const alerts = rows(alertRows)
    .filter((alert) => alert.status !== "Resolved")
    .map((row) => ({
      id: row.id,
      treeId: row.tree_id ?? null,
      treeCode: null,
      alertType: row.alert_type,
      priority: row.priority,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
    }));
  return {
    trees,
    species,
    locations,
    maintenance,
    alerts,
    statistics: buildStatistics(trees, species.length, locations.length, alerts.length),
  };
}

function groupedPoints(
  rowsToGroup: JsonObject[],
  getName: (row: JsonObject) => string,
  getValue: (row: JsonObject) => number,
  limit = 8,
): JsonObject[] {
  const groups = new Map<string, number>();
  for (const row of rowsToGroup) {
    const name = getName(row);
    groups.set(name, (groups.get(name) ?? 0) + getValue(row));
  }
  return [...groups.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value, secondaryValue: null }));
}

function survivalScore(tree: JsonObject): {
  score: number;
  risk: "Low" | "Medium" | "High" | "Critical";
  factors: string[];
} {
  let score = 0.82;
  const factors: string[] = [];
  const health = asString(tree.healthCondition);
  if (health === "Healthy") {
    score += 0.08;
    factors.push("Tree is currently marked healthy.");
  } else if (health === "Moderate") {
    score -= 0.03;
    factors.push("Moderate health may need closer monitoring.");
  } else if (health === "Poor") {
    score -= 0.20;
    factors.push("Poor health condition lowers the estimate.");
  } else if (health === "Critical") {
    score -= 0.36;
    factors.push("Critical health condition significantly lowers the estimate.");
  } else {
    score -= 0.08;
    factors.push("Health condition is unknown, so this estimate is less certain.");
  }

  if (tree.status === "Dead") {
    score = 0.02;
    factors.push("Tree status is marked dead.");
  } else if (tree.status === "Needs Attention") {
    score -= 0.12;
    factors.push("Tree is marked as needing attention.");
  } else {
    factors.push("Tree is currently marked alive.");
  }

  const lastMaintainedAt = asNullableString(tree.lastMaintainedAt);
  if (!lastMaintainedAt) {
    score -= 0.08;
    factors.push("No maintenance history is recorded.");
  } else {
    const ageDays =
      (Date.now() - new Date(lastMaintainedAt).getTime()) / 86_400_000;
    if (ageDays <= 30) {
      score += 0.04;
      factors.push("Maintenance was recorded within the last 30 days.");
    } else {
      score -= 0.08;
      factors.push("No maintenance is recorded in the last 30 days.");
    }
  }

  score = Math.max(0.02, Math.min(0.98, score));
  const risk =
    score >= 0.75 ? "Low" : score >= 0.5 ? "Medium" : score >= 0.25 ? "High" : "Critical";
  return { score, risk, factors };
}

function makeRecommendations(trees: JsonObject[]): JsonObject[] {
  const now = Date.now();
  const recommendations: JsonObject[] = [];
  for (const tree of trees) {
    const health = asString(tree.healthCondition);
    const isAttention = tree.status === "Needs Attention";
    const lastMaintainedAt = asNullableString(tree.lastMaintainedAt);
    const daysSinceMaintenance = lastMaintainedAt
      ? (now - new Date(lastMaintainedAt).getTime()) / 86_400_000
      : Number.POSITIVE_INFINITY;

    if (health === "Critical" || health === "Poor" || isAttention) {
      recommendations.push({
        treeId: tree.id,
        treeCode: tree.treeCode,
        speciesName: tree.speciesName,
        locationLabel: tree.locationLabel,
        priority: health === "Critical" ? "CRITICAL" : health === "Poor" ? "HIGH" : "MEDIUM",
        recommendation:
          health === "Critical"
            ? "Arrange an in-person inspection and record the findings."
            : "Inspect the canopy, check soil moisture, and schedule appropriate care.",
        reason: `The tree is marked ${health.toLowerCase()}${isAttention ? " and needs attention" : ""}.`,
        suggestedTimeframe: health === "Critical" ? "As soon as possible" : "Within 48 hours",
      });
      continue;
    }

    if (daysSinceMaintenance > 30) {
      recommendations.push({
        treeId: tree.id,
        treeCode: tree.treeCode,
        speciesName: tree.speciesName,
        locationLabel: tree.locationLabel,
        priority: "MEDIUM",
        recommendation: "Check soil moisture and add a maintenance visit to the schedule.",
        reason: lastMaintainedAt
          ? "No maintenance has been recorded in the last 30 days."
          : "No maintenance activity has been recorded for this tree.",
        suggestedTimeframe: "Within 7 days",
      });
    }
  }
  return recommendations.sort((a, b) => {
    const priorityRank: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };
    return (
      priorityRank[String(a.priority)] - priorityRank[String(b.priority)]
    );
  });
}

async function callOpenAi(
  messages: Array<Record<string, unknown>>,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        max_completion_tokens: 8192,
        messages,
      }),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : null;
  } catch {
    return null;
  }
}

function parseJsonObject(value: string): DbRow | null {
  const clean = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed: unknown = JSON.parse(clean);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as DbRow)
      : null;
  } catch {
    return null;
  }
}

router.use(attachGreenTrackAuth);

router.get("/dashboard/statistics", async (req, res, next): Promise<void> => {
  try {
    const { statistics } = await dashboardData(requireGreenTrackAuth(req));
    res.json(GetDashboardStatisticsResponse.parse(statistics));
  } catch (error) {
    next(error);
  }
});

router.get("/dashboard/trends", async (req, res, next): Promise<void> => {
  try {
    const data = await dashboardData(requireGreenTrackAuth(req));
    const statusRows = data.trees;
    const monthGroups = new Map<string, number>();
    const date = new Date();
    for (let offset = 5; offset >= 0; offset -= 1) {
      const pointDate = new Date(date.getFullYear(), date.getMonth() - offset, 1);
      monthGroups.set(
        pointDate.toLocaleString("en-US", { month: "short" }),
        0,
      );
    }
    for (const tree of statusRows) {
      const planted = new Date(asString(tree.plantingDate));
      const key = planted.toLocaleString("en-US", { month: "short" });
      if (monthGroups.has(key)) monthGroups.set(key, (monthGroups.get(key) ?? 0) + 1);
    }
    const planting = [...monthGroups.entries()].map(([name, value]) => ({
      name,
      value,
      secondaryValue: null,
    }));
    const trends = {
      species: groupedPoints(data.species, (row) => asString(row.commonName), (row) =>
        asNumber(row.treeCount) ?? 0,
      ),
      locations: groupedPoints(data.locations, (row) => asString(row.label), (row) =>
        asNumber(row.treeCount) ?? 0,
      ),
      planting,
      maintenance: groupedPoints(
        data.maintenance,
        (row) => asString(row.maintenanceType),
        () => 1,
      ),
    };
    res.json(GetDashboardTrendsResponse.parse(trends));
  } catch (error) {
    next(error);
  }
});

router.get("/trees", async (req, res, next): Promise<void> => {
  try {
    const parsed = ListTreesQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Tree filters are invalid." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    let result = rows(await rawTrees(auth));
    const filters = parsed.data;
    if (filters.status) result = result.filter((row) => row.status === filters.status);
    if (filters.health) result = result.filter((row) => row.health_condition === filters.health);
    if (filters.speciesId) result = result.filter((row) => row.species_id === filters.speciesId);
    if (filters.locationId) result = result.filter((row) => row.location_id === filters.locationId);
    let formatted = result.map(toTree);
    if (filters.search) {
      const search = filters.search.toLocaleLowerCase();
      formatted = formatted.filter((tree) =>
        [
          tree.treeCode,
          tree.speciesName,
          tree.commonName,
          tree.locationLabel,
          tree.area,
          tree.city,
        ]
          .filter((part): part is string => typeof part === "string")
          .some((part) => part.toLocaleLowerCase().includes(search)),
      );
    }
    res.json(ListTreesResponse.parse(formatted));
  } catch (error) {
    next(error);
  }
});

router.post("/trees", async (req, res, next): Promise<void> => {
  try {
    const parsed = CreateTreeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Please check the tree details." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    const query = orgQuery(auth, TREE_SELECT);
    const saved = rows(
      await restRequest<DbRow[]>(auth, "trees", query, {
        method: "POST",
        body: JSON.stringify({
          ...toTreePayload(parsed.data),
          organization_id: auth.organizationId,
          created_by: auth.userId,
        }),
      }),
    );
    res.status(201).json(CreateTreeResponse.parse(toTree(requireRows(saved, "Tree"))));
  } catch (error) {
    next(error);
  }
});

router.get("/trees/:treeId", async (req, res, next): Promise<void> => {
  try {
    const parsed = GetTreeParams.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Tree ID is invalid." });
      return;
    }
    const record = await treeById(requireGreenTrackAuth(req), parsed.data.treeId);
    if (!record) {
      res.status(404).json({ error: "Tree was not found." });
      return;
    }
    res.json(GetTreeResponse.parse(toTree(record)));
  } catch (error) {
    next(error);
  }
});

router.patch("/trees/:treeId", async (req, res, next): Promise<void> => {
  try {
    const params = UpdateTreeParams.safeParse(req.params);
    const body = UpdateTreeBody.safeParse(req.body);
    if (!params.success || !body.success || Object.keys(body.data).length === 0) {
      res.status(400).json({ error: "Please check the tree details." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    const query = queryForId(auth, params.data.treeId, TREE_SELECT);
    const saved = rows(
      await restRequest<DbRow[]>(auth, "trees", query, {
        method: "PATCH",
        body: JSON.stringify(toTreePayload(body.data)),
      }),
    );
    res.json(UpdateTreeResponse.parse(toTree(requireRows(saved, "Tree"))));
  } catch (error) {
    next(error);
  }
});

router.delete("/trees/:treeId", async (req, res, next): Promise<void> => {
  try {
    const params = DeleteTreeParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Tree ID is invalid." });
      return;
    }
    const query = queryForId(requireGreenTrackAuth(req), params.data.treeId, "id");
    await restRequest<unknown>(requireGreenTrackAuth(req), "trees", query, {
      method: "DELETE",
    });
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

router.get("/species", async (req, res, next): Promise<void> => {
  try {
    const auth = requireGreenTrackAuth(req);
    const [species, trees] = await Promise.all([rawSpecies(auth), rawTrees(auth)]);
    res.json(ListSpeciesResponse.parse(species.map((row) => toSpecies(row, trees))));
  } catch (error) {
    next(error);
  }
});

router.post("/species", async (req, res, next): Promise<void> => {
  try {
    const body = CreateSpeciesBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Please check the species details." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    const query = orgQuery(auth, "*");
    const saved = rows(
      await restRequest<DbRow[]>(auth, "species", query, {
        method: "POST",
        body: JSON.stringify({
          ...toSpeciesPayload(body.data),
          organization_id: auth.organizationId,
        }),
      }),
    );
    res.status(201).json(CreateSpeciesResponse.parse(toSpecies(requireRows(saved, "Species"))));
  } catch (error) {
    next(error);
  }
});

router.patch("/species/:speciesId", async (req, res, next): Promise<void> => {
  try {
    const params = UpdateSpeciesParams.safeParse(req.params);
    const body = UpdateSpeciesBody.safeParse(req.body);
    if (!params.success || !body.success || Object.keys(body.data).length === 0) {
      res.status(400).json({ error: "Please check the species details." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    const saved = rows(
      await restRequest<DbRow[]>(
        auth,
        "species",
        queryForId(auth, params.data.speciesId, "*"),
        { method: "PATCH", body: JSON.stringify(toSpeciesPayload(body.data)) },
      ),
    );
    const trees = await rawTrees(auth);
    res.json(UpdateSpeciesResponse.parse(toSpecies(requireRows(saved, "Species"), trees)));
  } catch (error) {
    next(error);
  }
});

router.delete("/species/:speciesId", async (req, res, next): Promise<void> => {
  try {
    const params = DeleteSpeciesParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Species ID is invalid." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    await restRequest<unknown>(
      auth,
      "species",
      queryForId(auth, params.data.speciesId, "id"),
      { method: "DELETE" },
    );
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

router.get("/locations", async (req, res, next): Promise<void> => {
  try {
    const auth = requireGreenTrackAuth(req);
    const [locations, trees] = await Promise.all([rawLocations(auth), rawTrees(auth)]);
    res.json(ListLocationsResponse.parse(locations.map((row) => toLocation(row, trees))));
  } catch (error) {
    next(error);
  }
});

router.post("/locations", async (req, res, next): Promise<void> => {
  try {
    const body = CreateLocationBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Please check the location details." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    const saved = rows(
      await restRequest<DbRow[]>(auth, "locations", orgQuery(auth, "*"), {
        method: "POST",
        body: JSON.stringify({
          ...toLocationPayload(body.data),
          organization_id: auth.organizationId,
        }),
      }),
    );
    res.status(201).json(CreateLocationResponse.parse(toLocation(requireRows(saved, "Location"))));
  } catch (error) {
    next(error);
  }
});

router.patch("/locations/:locationId", async (req, res, next): Promise<void> => {
  try {
    const params = UpdateLocationParams.safeParse(req.params);
    const body = UpdateLocationBody.safeParse(req.body);
    if (!params.success || !body.success || Object.keys(body.data).length === 0) {
      res.status(400).json({ error: "Please check the location details." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    const saved = rows(
      await restRequest<DbRow[]>(
        auth,
        "locations",
        queryForId(auth, params.data.locationId, "*"),
        { method: "PATCH", body: JSON.stringify(toLocationPayload(body.data)) },
      ),
    );
    const trees = await rawTrees(auth);
    res.json(UpdateLocationResponse.parse(toLocation(requireRows(saved, "Location"), trees)));
  } catch (error) {
    next(error);
  }
});

router.delete("/locations/:locationId", async (req, res, next): Promise<void> => {
  try {
    const params = DeleteLocationParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Location ID is invalid." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    await restRequest<unknown>(
      auth,
      "locations",
      queryForId(auth, params.data.locationId, "id"),
      { method: "DELETE" },
    );
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

router.get("/maintenance", async (req, res, next): Promise<void> => {
  try {
    const params = ListMaintenanceQueryParams.safeParse(req.query);
    if (!params.success) {
      res.status(400).json({ error: "Maintenance filters are invalid." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    const query = orgQuery(
      auth,
      "*,trees(tree_code,species(common_name),locations(label))",
    );
    query.set("order", "maintenance_date.desc");
    if (params.data.treeId) query.set("tree_id", `eq.${params.data.treeId}`);
    const result = await restAllRows(auth, "maintenance", query);
    res.json(ListMaintenanceResponse.parse(result.map(toMaintenance)));
  } catch (error) {
    next(error);
  }
});

router.post("/maintenance", async (req, res, next): Promise<void> => {
  try {
    const body = CreateMaintenanceBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Please check the maintenance details." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    const query = orgQuery(
      auth,
      "*,trees(tree_code,species(common_name),locations(label))",
    );
    const saved = rows(
      await restRequest<DbRow[]>(auth, "maintenance", query, {
        method: "POST",
        body: JSON.stringify({
          ...toMaintenancePayload(body.data),
          organization_id: auth.organizationId,
          user_id: auth.userId,
        }),
      }),
    );
    res.status(201).json(CreateMaintenanceResponse.parse(toMaintenance(requireRows(saved, "Maintenance activity"))));
  } catch (error) {
    next(error);
  }
});

router.patch("/maintenance/:maintenanceId", async (req, res, next): Promise<void> => {
  try {
    const params = UpdateMaintenanceParams.safeParse(req.params);
    const body = UpdateMaintenanceBody.safeParse(req.body);
    if (!params.success || !body.success || Object.keys(body.data).length === 0) {
      res.status(400).json({ error: "Please check the maintenance details." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    const query = queryForId(
      auth,
      params.data.maintenanceId,
      "*,trees(tree_code,species(common_name),locations(label))",
    );
    const saved = rows(
      await restRequest<DbRow[]>(auth, "maintenance", query, {
        method: "PATCH",
        body: JSON.stringify(toMaintenancePayload(body.data)),
      }),
    );
    res.json(UpdateMaintenanceResponse.parse(toMaintenance(requireRows(saved, "Maintenance activity"))));
  } catch (error) {
    next(error);
  }
});

router.delete("/maintenance/:maintenanceId", async (req, res, next): Promise<void> => {
  try {
    const params = DeleteMaintenanceParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Maintenance ID is invalid." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    await restRequest<unknown>(
      auth,
      "maintenance",
      queryForId(auth, params.data.maintenanceId, "id"),
      { method: "DELETE" },
    );
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

router.get("/alerts", async (req, res, next): Promise<void> => {
  try {
    const auth = requireGreenTrackAuth(req);
    const query = orgQuery(auth, "*,trees(tree_code)");
    query.set("status", "neq.Resolved");
    query.set("order", "created_at.desc");
    const result = (await restAllRows(auth, "alerts", query)).map((row) => ({
      id: row.id,
      treeId: row.tree_id ?? null,
      treeCode: asRecord(row.trees).tree_code ?? null,
      alertType: row.alert_type,
      priority: row.priority,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
    }));
    res.json(ListAlertsResponse.parse(result));
  } catch (error) {
    next(error);
  }
});

router.patch("/alerts/:alertId", async (req, res, next): Promise<void> => {
  try {
    const params = UpdateAlertParams.safeParse(req.params);
    const body = UpdateAlertBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Please check the alert update." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    const query = queryForId(auth, params.data.alertId, "*,trees(tree_code)");
    const saved = rows(
      await restRequest<DbRow[]>(auth, "alerts", query, {
        method: "PATCH",
        body: JSON.stringify({ status: body.data.status }),
      }),
    );
    const row = requireRows(saved, "Alert");
    res.json(
      UpdateAlertResponse.parse({
        id: row.id,
        treeId: row.tree_id ?? null,
        treeCode: asRecord(row.trees).tree_code ?? null,
        alertType: row.alert_type,
        priority: row.priority,
        message: row.message,
        status: row.status,
        createdAt: row.created_at,
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.delete("/alerts/:alertId", async (req, res, next): Promise<void> => {
  try {
    const params = DeleteAlertParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Alert ID is invalid." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    await restRequest<unknown>(
      auth,
      "alerts",
      queryForId(auth, params.data.alertId, "id"),
      { method: "DELETE" },
    );
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

router.post("/ai/health-analysis", async (req, res, next): Promise<void> => {
  try {
    const body = AnalyzeTreeHealthBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "A tree and stored image are required." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    const treeRecord = await treeById(auth, body.data.treeId);
    if (!treeRecord) {
      res.status(404).json({ error: "Tree was not found." });
      return;
    }
    const url = new URL(body.data.imageUrl);
    const supabaseUrl = new URL(
      process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "",
    );
    if (url.hostname !== supabaseUrl.hostname || url.protocol !== "https:") {
      res.status(400).json({ error: "The image must be stored in this organization's Supabase bucket." });
      return;
    }

    const imagePathMatch = url.pathname.match(/\/storage\/v1\/object\/(?:sign|public)\/tree-images\/(.+)$/);
    if (!imagePathMatch) {
      res.status(400).json({ error: "The image must be stored in the private tree-images bucket." });
      return;
    }
    const imagePath = imagePathMatch
      ? decodeURIComponent(imagePathMatch[1])
      : body.data.imageUrl;
    const apiKey = process.env.OPENAI_API_KEY;
    let analysis = {
      healthStatus: "Unknown",
      possibleIssue: "Image received. Visual AI analysis is not configured, so no diagnosis was made.",
      confidenceScore: 0,
      recommendation: "Arrange a field inspection and record the tree's observable symptoms.",
      assessmentType: "Rule-based",
    };

    if (apiKey) {
      const completion = await callOpenAi([
        {
          role: "system",
          content:
            "Assess a tree photo cautiously. This is not a guaranteed diagnosis. Return only JSON with healthStatus (Healthy, Moderate, Poor, Critical, or Unknown), possibleIssue, confidenceScore (0 to 1), recommendation. If uncertain, use Unknown and low confidence.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Assess this tree image and recommend a practical next step." },
            { type: "image_url", image_url: { url: body.data.imageUrl } },
          ],
        },
      ]);
      const parsed = completion ? parseJsonObject(completion) : null;
      if (parsed) {
        const allowed = ["Healthy", "Moderate", "Poor", "Critical", "Unknown"];
        analysis = {
          healthStatus: allowed.includes(asString(parsed.healthStatus))
            ? asString(parsed.healthStatus)
            : "Unknown",
          possibleIssue: asString(parsed.possibleIssue, "The image could not be assessed reliably."),
          confidenceScore: Math.max(0, Math.min(1, asNumber(parsed.confidenceScore) ?? 0)),
          recommendation: asString(parsed.recommendation, "Request an in-person inspection."),
          assessmentType: "AI",
        };
      }
    }

    const savedRows = rows(
      await restRequest<DbRow[]>(auth, "health_analysis", new URLSearchParams(), {
        method: "POST",
        body: JSON.stringify({
          organization_id: auth.organizationId,
          tree_id: body.data.treeId,
          image_url: imagePath,
          health_status: analysis.healthStatus,
          possible_issue: analysis.possibleIssue,
          confidence_score: analysis.confidenceScore,
          ai_recommendation: analysis.recommendation,
          assessment_type: analysis.assessmentType,
        }),
      }),
    );
    if (analysis.healthStatus !== "Unknown") {
      await restRequest<unknown>(
        auth,
        "trees",
        queryForId(auth, body.data.treeId, "id"),
        {
          method: "PATCH",
          body: JSON.stringify({ health_condition: analysis.healthStatus }),
        },
      );
    }
    const result = {
      treeId: body.data.treeId,
      healthStatus: analysis.healthStatus,
      possibleIssue: analysis.possibleIssue,
      confidenceScore: analysis.confidenceScore,
      recommendation: analysis.recommendation,
      assessmentType: analysis.assessmentType,
      disclaimer:
        "An AI-based assessment is not a guaranteed diagnosis. Confirm concerns with an in-person inspection.",
    };
    if (!savedRows.length) {
      throw new ApiProblem(503, "The analysis could not be saved.");
    }
    res.json(AnalyzeTreeHealthResponse.parse(result));
  } catch (error) {
    next(error);
  }
});

router.post("/ai/survival-prediction", async (req, res, next): Promise<void> => {
  try {
    const body = PredictTreeSurvivalBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "A valid tree is required." });
      return;
    }
    const auth = requireGreenTrackAuth(req);
    const record = await treeById(auth, body.data.treeId);
    if (!record) {
      res.status(404).json({ error: "Tree was not found." });
      return;
    }
    const tree = toTree(record);
    const estimate = survivalScore(tree);
    const factors = estimate.factors;
    const query = new URLSearchParams({ select: "*" });
    const saved = rows(
      await restRequest<DbRow[]>(auth, "survival_predictions", query, {
        method: "POST",
        body: JSON.stringify({
          organization_id: auth.organizationId,
          tree_id: body.data.treeId,
          survival_probability: estimate.score,
          risk_level: estimate.risk,
          prediction_factors: factors,
          model_version: "rules-demo-v1",
          scientifically_validated: false,
        }),
      }),
    );
    await restRequest<unknown>(
      auth,
      "trees",
      queryForId(auth, body.data.treeId, "id"),
      {
        method: "PATCH",
        body: JSON.stringify({
          survival_probability: estimate.score,
          risk_level: estimate.risk,
        }),
      },
    );
    if (saved.length === 0) {
      throw new ApiProblem(503, "The prediction could not be saved.");
    }
    res.json(
      PredictTreeSurvivalResponse.parse({
        treeId: body.data.treeId,
        survivalProbability: estimate.score,
        riskLevel: estimate.risk,
        factors,
        modelVersion: "rules-demo-v1",
        scientificallyValidated: false,
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/ai/recommendations", async (req, res, next): Promise<void> => {
  try {
    const data = await dashboardData(requireGreenTrackAuth(req));
    const recommendations = makeRecommendations(data.trees);
    res.json(GetAiRecommendationsResponse.parse(recommendations));
  } catch (error) {
    next(error);
  }
});

router.get("/ai/insights", async (req, res, next): Promise<void> => {
  try {
    const data = await dashboardData(requireGreenTrackAuth(req));
    const insights: JsonObject[] = [];
    if (data.trees.length === 0) {
      insights.push({
        title: "No plantation records yet",
        message: "Add trees to generate organization insights from your own records.",
        category: "Getting started",
        priority: "LOW",
        metric: null,
      });
    } else {
      const attention = data.trees.filter(
        (tree) =>
          tree.status === "Needs Attention" ||
          tree.healthCondition === "Poor" ||
          tree.healthCondition === "Critical",
      );
      if (attention.length > 0) {
        insights.push({
          title: `${attention.length} trees need a follow-up`,
          message: "Review the flagged tree records and schedule inspections for urgent cases.",
          category: "Tree health",
          priority: attention.some((tree) => tree.healthCondition === "Critical") ? "HIGH" : "MEDIUM",
          metric: attention.length,
        });
      }
      const weakestLocation = [...data.locations]
        .filter((location) => (asNumber(location.treeCount) ?? 0) > 0)
        .sort((a, b) => (asNumber(a.survivalRate) ?? 0) - (asNumber(b.survivalRate) ?? 0))[0];
      if (weakestLocation) {
        insights.push({
          title: `${weakestLocation.label} has the lowest recorded survival`,
          message: `Its current survival rate is ${Math.round(asNumber(weakestLocation.survivalRate) ?? 0)}%, calculated from the recorded tree statuses.`,
          category: "Location performance",
          priority: (asNumber(weakestLocation.survivalRate) ?? 0) < 70 ? "HIGH" : "MEDIUM",
          metric: asNumber(weakestLocation.survivalRate),
        });
      }
      const stale = data.trees.filter((tree) => {
        const maintained = asNullableString(tree.lastMaintainedAt);
        return (
          !maintained ||
          (Date.now() - new Date(maintained).getTime()) / 86_400_000 > 30
        );
      });
      if (stale.length > 0) {
        insights.push({
          title: "Maintenance records are missing or overdue",
          message: `${stale.length} trees have no maintenance in the last 30 days, based on the current activity log.`,
          category: "Maintenance",
          priority: stale.length > data.trees.length / 3 ? "HIGH" : "MEDIUM",
          metric: stale.length,
        });
      }
      if (insights.length === 0) {
        insights.push({
          title: "No immediate risk pattern found",
          message: "Current records show no poor or critical health flags. Continue regular inspections and maintenance logging.",
          category: "Monitoring",
          priority: "LOW",
          metric: null,
        });
      }
    }
    res.json(GetAiInsightsResponse.parse(insights));
  } catch (error) {
    next(error);
  }
});

router.post("/ai/chat", async (req, res, next): Promise<void> => {
  try {
    const body = ChatWithAiBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Enter a question of up to 1,000 characters." });
      return;
    }
    const data = await dashboardData(requireGreenTrackAuth(req));
    const question = body.data.question.trim();
    const lowered = question.toLocaleLowerCase();
    let answer = "";
    let responseType: "AI" | "Rule-based" | "Insufficient Data" = "Insufficient Data";
    let grounded = false;
    const sourceCount = data.trees.length;

    if (data.trees.length > 0 && /(how many|total|planted|plantation)/.test(lowered)) {
      answer = `Your organization has planted ${data.statistics.totalTrees} trees. ${data.statistics.livingTrees} are currently recorded as living and ${data.statistics.deadTrees} as dead.`;
      responseType = "Rule-based";
      grounded = true;
    } else if (data.trees.length > 0 && /(survival|survive)/.test(lowered)) {
      answer = `The recorded organization survival rate is ${Math.round(asNumber(data.statistics.survivalRate) ?? 0)}%, calculated as living trees divided by total trees.`;
      responseType = "Rule-based";
      grounded = true;
    } else if (data.trees.length > 0 && /(maintenan|care|attention|inspect|water)/.test(lowered)) {
      const needsCare = makeRecommendations(data.trees).slice(0, 8);
      answer = needsCare.length
        ? `These trees need follow-up based on health and maintenance records: ${needsCare.map((tree) => `${tree.treeCode} (${tree.priority})`).join(", ")}.`
        : "No trees currently meet the app's rule-based follow-up criteria. Continue recording regular inspections.";
      responseType = "Rule-based";
      grounded = true;
    } else if (data.trees.length > 0 && /(highest|lowest|species|location|zone|area)/.test(lowered)) {
      const candidates = /(location|zone|area)/.test(lowered) ? data.locations : data.species;
      const viable = candidates.filter((item) => (asNumber(item.treeCount) ?? 0) > 0);
      const best = [...viable].sort(
        (a, b) => (asNumber(b.survivalRate) ?? 0) - (asNumber(a.survivalRate) ?? 0),
      )[0];
      const worst = [...viable].sort(
        (a, b) => (asNumber(a.survivalRate) ?? 0) - (asNumber(b.survivalRate) ?? 0),
      )[0];
      answer =
        best && worst
          ? `By recorded status, ${best.commonName ?? best.label} currently has the highest survival rate (${Math.round(asNumber(best.survivalRate) ?? 0)}%) and ${worst.commonName ?? worst.label} the lowest (${Math.round(asNumber(worst.survivalRate) ?? 0)}%).`
          : "There is not enough species or location data to compare survival rates.";
      responseType = "Rule-based";
      grounded = Boolean(best && worst);
    } else if (data.trees.length > 0 && /(risk|high-risk|high risk)/.test(lowered)) {
      const highRisk = data.trees.filter(
        (tree) =>
          tree.riskLevel === "High" ||
          tree.riskLevel === "Critical" ||
          tree.healthCondition === "Poor" ||
          tree.healthCondition === "Critical",
      );
      answer = highRisk.length
        ? `${highRisk.length} trees are currently marked high-risk or have poor/critical health: ${highRisk.slice(0, 8).map((tree) => tree.treeCode).join(", ")}.`
        : "No trees are currently marked high-risk or have poor/critical health.";
      responseType = "Rule-based";
      grounded = true;
    } else if (data.trees.length > 0 && process.env.OPENAI_API_KEY) {
      const context = JSON.stringify({
        statistics: data.statistics,
        trees: data.trees.slice(0, 100).map((tree) => ({
          code: tree.treeCode,
          species: tree.commonName,
          location: tree.locationLabel,
          status: tree.status,
          health: tree.healthCondition,
          lastMaintainedAt: tree.lastMaintainedAt,
          survivalProbability: tree.survivalProbability,
          riskLevel: tree.riskLevel,
        })),
        species: data.species,
        locations: data.locations,
      });
      const completion = await callOpenAi([
        {
          role: "system",
          content:
            "Answer only from the supplied GreenTrack organization data. Do not guess or invent a statistic. If the data does not support an answer, say that there is not enough data. Be concise.",
        },
        { role: "user", content: `Organization data: ${context}\nQuestion: ${question}` },
      ]);
      if (completion) {
        answer = completion;
        responseType = "AI";
        grounded = true;
      }
    }

    if (!answer) {
      answer = "I don't have enough data to answer that accurately. Try asking about tree totals, survival, maintenance, species, locations, or recorded risk.";
    }
    res.json(
      ChatWithAiResponse.parse({
        answer,
        grounded,
        sourceCount,
        responseType,
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/reports/summary", async (req, res, next): Promise<void> => {
  try {
    const data = await dashboardData(requireGreenTrackAuth(req));
    res.json(
      GetReportsSummaryResponse.parse({
        generatedAt: new Date().toISOString(),
        statistics: data.statistics,
        trees: data.trees,
        species: data.species,
        locations: data.locations,
        maintenance: data.maintenance,
      }),
    );
  } catch (error) {
    next(error);
  }
});

export default router;
