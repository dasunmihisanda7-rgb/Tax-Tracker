"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Download, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { clientTypeLabel } from "@/lib/constants";
import { CSV_TEMPLATE } from "@/lib/clients/schema";
import {
  previewImport,
  runImport,
  type ImportPreview,
  type ImportResult,
} from "@/lib/clients/actions";

export function ImportForm() {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const validCount = preview?.rows.filter((r) => r.errors.length === 0).length ?? 0;
  const invalidCount = (preview?.rows.length ?? 0) - validCount;

  const changeText = (value: string) => {
    setText(value);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    changeText(await file.text());
  };

  const check = () =>
    startTransition(async () => {
      setError(null);
      setPreview(await previewImport(text));
    });

  const doImport = () =>
    startTransition(async () => {
      const res = await runImport(text);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setResult(res);
      setPreview(null);
      toast.success(`${res.imported} ${res.imported === 1 ? "client" : "clients"} added.`);
    });

  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`;

  if (result) {
    return (
      <div className="grid max-w-2xl gap-4">
        <div className="rounded-lg border p-4">
          <p className="font-medium">
            {result.imported} {result.imported === 1 ? "client was" : "clients were"} added.
          </p>
          {result.skipped > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {result.skipped} {result.skipped === 1 ? "row was" : "rows were"} skipped because of errors.
              Fix them and import again; rows already added will then show as duplicates.
            </p>
          )}
          {result.failed.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm text-destructive">
              {result.failed.map((f) => (
                <li key={f.line}>
                  Line {f.line} ({f.name}): {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/clients" className={buttonVariants()}>
            Go to clients
          </Link>
          <Button variant="outline" onClick={() => changeText("")}>
            Import another file
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid max-w-3xl gap-3">
        <p className="text-sm text-muted-foreground">
          One client per line with three columns: <code>name,client_type,tax_types</code>. Client type is
          company, individual or partnership. List tax types in one cell separated by semicolons, for
          example <code>CIT;APIT;WHT</code>. Put names that contain commas in double quotes.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={templateHref} download="clients-template.csv" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Download className="size-4" />
            Download template
          </a>
          <label className={buttonVariants({ variant: "outline", size: "sm" })}>
            <FileUp className="size-4" />
            Upload CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="csv">Or paste the CSV here</Label>
          <Textarea
            id="csv"
            rows={10}
            className="font-mono text-xs"
            value={text}
            onChange={(e) => changeText(e.target.value)}
            placeholder={CSV_TEMPLATE}
          />
        </div>
        <div>
          <Button onClick={check} disabled={pending || !text.trim()}>
            {pending && !preview ? "Checking…" : "Check file"}
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {preview && (
        <div className="grid gap-3">
          {preview.fileErrors.length > 0 ? (
            <ul className="list-disc pl-5 text-sm text-destructive" role="alert">
              {preview.fileErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">
              <span className="font-medium">{validCount}</span> ready to import
              {invalidCount > 0 && (
                <>
                  , <span className="font-medium text-destructive">{invalidCount}</span> with errors (these will be
                  skipped)
                </>
              )}
              .
            </p>
          )}

          {preview.rows.length > 0 && (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Line</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Client type</TableHead>
                    <TableHead>Tax types</TableHead>
                    <TableHead>Check</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((r) => (
                    <TableRow key={r.line} className={r.errors.length ? "bg-destructive/5" : undefined}>
                      <TableCell className="text-muted-foreground">{r.line}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.client_type ? clientTypeLabel(r.client_type) : ""}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {r.tax_types.map((t) => (
                            <Badge key={t} variant="secondary">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {r.errors.length === 0 ? (
                          <span className="text-sm text-emerald-700 dark:text-emerald-400">OK</span>
                        ) : (
                          <ul className="text-sm text-destructive">
                            {r.errors.map((e) => (
                              <li key={e}>{e}</li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {preview.fileErrors.length === 0 && validCount > 0 && (
            <div>
              <Button onClick={doImport} disabled={pending}>
                {pending ? "Importing…" : `Import ${validCount} ${validCount === 1 ? "client" : "clients"}`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
