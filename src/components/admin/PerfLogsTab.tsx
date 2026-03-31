import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ChevronLeft, ChevronRight, Loader2, BarChart3 } from "lucide-react";

const PAGE_SIZE = 25;

const NUM_COLS = [
  "stt_ms",
  "chat_api_ms",
  "chat_db_ms",
  "chat_ai_ms",
  "tts_api_ms",
  "tts_generation_ms",
  "audio_play_ms",
  "total_ms",
] as const;

type NumCol = (typeof NUM_COLS)[number];

function totalColor(ms: number | null): string {
  if (ms == null) return "";
  if (ms < 500) return "text-green-600 dark:text-green-400 font-semibold";
  if (ms <= 1500) return "text-yellow-600 dark:text-yellow-400 font-semibold";
  return "text-red-600 dark:text-red-400 font-semibold";
}

function fmtMs(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString();
}

function short(id: string | null | undefined): string {
  if (!id) return "—";
  return id.slice(0, 8);
}

export function PerfLogsTab() {
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [userSearch, setUserSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [page, setPage] = useState(0);

  const {
    data: rows = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["perf-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_perf_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Distinct providers for filter dropdown
  const providers = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.tts_provider) set.add(r.tts_provider);
    });
    return [...set].sort();
  }, [rows]);

  // Filtered rows
  const filtered = useMemo(() => {
    let result = rows;

    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter((r) => new Date(r.created_at) >= start);
    }
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((r) => new Date(r.created_at) <= end);
    }
    if (userSearch.trim()) {
      const q = userSearch.trim().toLowerCase();
      result = result.filter((r) => r.user_id?.toLowerCase().includes(q));
    }
    if (providerFilter !== "all") {
      result = result.filter((r) => r.tts_provider === providerFilter);
    }

    return result;
  }, [rows, fromDate, toDate, userSearch, providerFilter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Averages across filtered rows
  const averages = useMemo(() => {
    const avgs: Record<string, number | null> = {};
    for (const col of NUM_COLS) {
      const vals = filtered
        .map((r) => (r as Record<string, unknown>)[col])
        .filter((v): v is number => typeof v === "number");
      avgs[col] = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    }
    return avgs;
  }, [filtered]);

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Unable to load performance logs. The table may not exist yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5" />
          Voice Chat Performance Logs
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          {/* From date */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">From</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[150px] justify-start text-left font-normal",
                    !fromDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {fromDate ? format(fromDate, "MMM d, yyyy") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(d) => { setFromDate(d); setPage(0); }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* To date */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">To</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[150px] justify-start text-left font-normal",
                    !toDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {toDate ? format(toDate, "MMM d, yyyy") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={(d) => { setToDate(d); setPage(0); }}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* User search */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">User ID</label>
            <Input
              placeholder="Search user…"
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setPage(0); }}
              className="w-[160px] h-9"
            />
          </div>

          {/* Provider */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">TTS Provider</label>
            <Select value={providerFilter} onValueChange={(v) => { setProviderFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear */}
          {(fromDate || toDate || userSearch || providerFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFromDate(undefined);
                setToDate(undefined);
                setUserSearch("");
                setProviderFilter("all");
                setPage(0);
              }}
            >
              Clear filters
            </Button>
          )}

          <Badge variant="secondary" className="ml-auto text-xs">
            {filtered.length} log{filtered.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && filtered.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No logs yet</p>
          </div>
        )}

        {/* Table */}
        {!isLoading && filtered.length > 0 && (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Time</TableHead>
                  <TableHead className="whitespace-nowrap">User</TableHead>
                  <TableHead className="whitespace-nowrap">Case</TableHead>
                  <TableHead className="whitespace-nowrap text-right">STT ms</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Chat API ms</TableHead>
                  <TableHead className="whitespace-nowrap text-right">DB ms</TableHead>
                  <TableHead className="whitespace-nowrap text-right">AI ms</TableHead>
                  <TableHead className="whitespace-nowrap text-right">TTS API ms</TableHead>
                  <TableHead className="whitespace-nowrap text-right">TTS Gen ms</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Audio ms</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Total ms</TableHead>
                  <TableHead className="whitespace-nowrap">Provider</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(row.created_at), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{short(row.user_id)}</TableCell>
                    <TableCell className="font-mono text-xs">{short(row.case_id)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtMs(row.stt_ms)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtMs(row.chat_api_ms)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtMs(row.chat_db_ms)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtMs(row.chat_ai_ms)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtMs(row.tts_api_ms)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtMs(row.tts_generation_ms)}</TableCell>
                    <TableCell className="text-right text-xs">{fmtMs(row.audio_play_ms)}</TableCell>
                    <TableCell className={cn("text-right text-xs", totalColor(row.total_ms))}>
                      {fmtMs(row.total_ms)}
                    </TableCell>
                    <TableCell>
                      {row.tts_provider ? (
                        <Badge variant="outline" className="text-[10px]">{row.tts_provider}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-xs font-semibold">
                    Average ({filtered.length} rows)
                  </TableCell>
                  <TableCell className="text-right text-xs font-semibold">{fmtMs(averages.stt_ms)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold">{fmtMs(averages.chat_api_ms)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold">{fmtMs(averages.chat_db_ms)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold">{fmtMs(averages.chat_ai_ms)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold">{fmtMs(averages.tts_api_ms)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold">{fmtMs(averages.tts_generation_ms)}</TableCell>
                  <TableCell className="text-right text-xs font-semibold">{fmtMs(averages.audio_play_ms)}</TableCell>
                  <TableCell className={cn("text-right text-xs font-semibold", totalColor(averages.total_ms))}>
                    {fmtMs(averages.total_ms)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              Page {safePage + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
