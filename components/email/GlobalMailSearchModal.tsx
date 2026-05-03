"use client";

import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn, fetcher, htmlToText } from "@/lib/utils";

import { Icons } from "../shared/icons";
import { TimeAgoIntl } from "../shared/time-ago";
import { Input } from "../ui/input";
import { Modal } from "../ui/modal";
import { Skeleton } from "../ui/skeleton";

interface SearchResult {
  id: string;
  from: string;
  fromName: string | null;
  to: string;
  subject: string | null;
  text: string | null;
  html: string | null;
  date: string | null;
  readAt: string | null;
  createdAt: string;
}

interface Props {
  show: boolean;
  setShow: Dispatch<SetStateAction<boolean>>;
  onSelectAddress: (address: string) => void;
}

export default function GlobalMailSearchModal({
  show,
  setShow,
  onSelectAddress,
}: Props) {
  const t = useTranslations("Email");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [data, setData] = useState<{
    list: SearchResult[];
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // 防抖
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    if (!debounced) {
      setData(null);
      return;
    }
    setLoading(true);
    fetcher(
      `/api/email/search?q=${encodeURIComponent(debounced)}&size=30&page=1`,
    )
      .then((res: any) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData({ list: [], total: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const highlight = (text: string) => {
    if (!debounced || !text) return text;
    const idx = text.toLowerCase().indexOf(debounced.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-700">
          {text.slice(idx, idx + debounced.length)}
        </mark>
        {text.slice(idx + debounced.length)}
      </>
    );
  };

  return (
    <Modal showModal={show} setShowModal={setShow}>
      <div className="flex max-h-[80vh] w-full flex-col">
        <div className="flex items-center gap-2 border-b p-4">
          <Search className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search across all messages (subject, from)")}
            className="h-9 border-0 px-1 text-sm shadow-none focus-visible:ring-0"
          />
          {loading && (
            <Icons.spinner className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="scrollbar-hidden min-h-[120px] flex-1 overflow-y-auto p-2">
          {!debounced && (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              {t(
                "Type to search emails by subject or sender across all your mailboxes",
              )}
            </div>
          )}

          {debounced && loading && !data && (
            <div className="flex flex-col gap-2 p-1">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[60px] w-full rounded-md" />
              ))}
            </div>
          )}

          {debounced && data && data.list.length === 0 && !loading && (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              {t("No matching emails found")}
            </div>
          )}

          {data && data.list.length > 0 && (
            <ul className="flex flex-col gap-1">
              {data.list.map((email) => (
                <li
                  key={email.id}
                  onClick={() => onSelectAddress(email.to)}
                  className="cursor-pointer rounded-md border border-transparent p-3 transition-colors hover:border-border hover:bg-muted"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        className={cn(
                          "truncate text-sm font-semibold",
                          !email.readAt
                            ? "text-neutral-900 dark:text-neutral-100"
                            : "text-neutral-700 dark:text-neutral-300",
                        )}
                      >
                        {highlight(
                          email.fromName ||
                            email.from ||
                            t("Unknown sender"),
                        )}
                      </span>
                      <span className="shrink-0 truncate rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        {email.to}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      <TimeAgoIntl
                        date={(email.date as any) || email.createdAt}
                      />
                    </span>
                  </div>
                  <div className="mb-0.5 line-clamp-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    {highlight(email.subject || t("No subject"))}
                  </div>
                  <div className="line-clamp-1 break-all text-xs text-neutral-500">
                    {email.html
                      ? htmlToText(email.html)
                      : email.text || ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {data && data.total > 0 && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            {t("Showing {n} of {total} matching emails", {
              n: data.list.length,
              total: data.total,
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
