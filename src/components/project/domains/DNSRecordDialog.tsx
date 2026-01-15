import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { CloudflareDNSRecord } from "@/types";
import {
  createCloudflareDNSRecord,
  updateCloudflareDNSRecord
} from "@/api/cloudflare";

interface DNSRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zoneId: string;
  zoneName: string;
  record?: CloudflareDNSRecord;
  onSuccess: () => void;
}

export function DNSRecordDialog({
  open,
  onOpenChange,
  zoneId,
  zoneName,
  record,
  onSuccess
}: DNSRecordDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<string>(record?.type || "A");
  const [name, setName] = useState(record?.name || "");
  const [content, setContent] = useState(record?.content || "");
  const [ttl, setTtl] = useState(record?.ttl?.toString() || "3600");
  const [proxied, setProxied] = useState(record?.proxied || false);
  const [priority, setPriority] = useState(
    record?.priority?.toString() || ""
  );

  const isEdit = !!record;

  const handleSubmit = async () => {
    if (!name.trim() || !content.trim()) {
      setError("Name and content are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const recordData: any = {
        type,
        name: name.trim(),
        content: content.trim(),
        ttl: parseInt(ttl, 10) || 3600
      };

      if (type === "A" || type === "AAAA" || type === "CNAME") {
        recordData.proxied = proxied;
      }

      if (type === "MX" || type === "SRV") {
        if (priority) {
          recordData.priority = parseInt(priority, 10);
        }
      }

      if (isEdit) {
        await updateCloudflareDNSRecord(zoneId, record.id, recordData);
      } else {
        await createCloudflareDNSRecord(zoneId, recordData);
      }

      onSuccess();
      onOpenChange(false);
      // Reset form
      setType("A");
      setName("");
      setContent("");
      setTtl("3600");
      setProxied(false);
      setPriority("");
    } catch (err: any) {
      console.error("Failed to save DNS record:", err);
      setError(err?.message || "Failed to save DNS record");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit DNS Record" : "Create DNS Record"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Edit DNS record for ${zoneName}`
              : `Create a new DNS record for ${zoneName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="dns-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="dns-type" className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="AAAA">AAAA</SelectItem>
                <SelectItem value="CNAME">CNAME</SelectItem>
                <SelectItem value="MX">MX</SelectItem>
                <SelectItem value="TXT">TXT</SelectItem>
                <SelectItem value="SRV">SRV</SelectItem>
                <SelectItem value="NS">NS</SelectItem>
                <SelectItem value="CAA">CAA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dns-name">Name</Label>
            <Input
              id="dns-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={zoneName}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use @ for root domain, or subdomain name
            </p>
          </div>

          <div>
            <Label htmlFor="dns-content">Content</Label>
            <Input
              id="dns-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                type === "A"
                  ? "192.0.2.1"
                  : type === "AAAA"
                    ? "2001:db8::1"
                    : type === "CNAME"
                      ? "example.com"
                      : type === "MX"
                        ? "10 mail.example.com"
                        : "Record value"
              }
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="dns-ttl">TTL (seconds)</Label>
            <Input
              id="dns-ttl"
              type="number"
              value={ttl}
              onChange={(e) => setTtl(e.target.value)}
              placeholder="3600"
              className="mt-2"
            />
          </div>

          {(type === "A" || type === "AAAA" || type === "CNAME") && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dns-proxied"
                checked={proxied}
                onCheckedChange={(checked) => setProxied(checked === true)}
              />
              <Label
                htmlFor="dns-proxied"
                className="text-sm font-normal cursor-pointer"
              >
                Proxied through Cloudflare
              </Label>
            </div>
          )}

          {(type === "MX" || type === "SRV") && (
            <div>
              <Label htmlFor="dns-priority">Priority</Label>
              <Input
                id="dns-priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                placeholder="10"
                className="mt-2"
              />
            </div>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
