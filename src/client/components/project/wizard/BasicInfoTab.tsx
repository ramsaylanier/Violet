import { Label } from "@/client/components/ui/label";
import { Input } from "@/client/components/ui/input";
import { Textarea } from "@/client/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/client/components/ui/select";
import type { WizardState } from "./ProjectCreationWizard";

interface BasicInfoTabProps {
  wizardState: WizardState;
  onUpdate: (updates: Partial<WizardState>) => void;
}

export function BasicInfoTab({ wizardState, onUpdate }: BasicInfoTabProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="project-name">
          Project Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="project-name"
          value={wizardState.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="My Awesome Project"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-type">
          Project Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={wizardState.type}
          onValueChange={(value) =>
            onUpdate({ type: value as "monorepo" | "multi-service" })
          }
        >
          <SelectTrigger id="project-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="multi-service">Multi-Service</SelectItem>
            <SelectItem value="monorepo">Monorepo</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {wizardState.type === "monorepo"
            ? "One repository with multiple deployments (e.g., Marketing Website, API, Client App)"
            : "One repository per deployment (1:1 relationship)"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-description">Description (optional)</Label>
        <Textarea
          id="project-description"
          value={wizardState.description || ""}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="A brief description of your project"
          rows={3}
        />
      </div>
    </div>
  );
}
