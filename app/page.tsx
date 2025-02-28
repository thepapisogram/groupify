"use client";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Header from "@/components/header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import clsx from "clsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import Link from "next/link";
import appMeta from "@/data/metadata";
import HowToUse from "@/components/how-to-use";

export default function Home() {

  const errors = {
    empty: "Please enter names",
    size: "Please enter a valid group size",
    format: "Please select a format",
    unknown: "Unknown Error Occurred"
  }

  // const [batches, setBatches] = useState<string[][]>([]);
  let batches: string[][] = [];
  const [bestDistribution, setBestDistribution] = useState(true);
  const [names, setNames] = useState<string>("");
  const [size, setSize] = useState<number>(2);
  const [format, setFormat] = useState<string>("excel");

  const genFile = () => {
    if (names === "") {
      toast.warning(errors.empty, {
        richColors: true,
        dismissible: true,
      });
      return false;
    }

    toast.loading("Generating File...");
    createGroups();
    
    setTimeout(() => {
      toast.dismiss();
      if (format === "excel") genExcel();
      else if (format === "word") genWord();
      else
        toast.error(errors.format, {
          richColors: true,
          dismissible: true,
        });
    }, 1000);
  };

  const createGroups = async () => {
    if (size <= 0 || isNaN(size)) {
      toast.error(errors.size, {
        richColors: true,
        dismissible: true,
      });
      return;
    }

    const AllMembers = names.split("\n").filter((name) => name.trim() !== ""); // Filter out empty lines

    // Shuffle Members
    for (let i = AllMembers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [AllMembers[i], AllMembers[j]] = [AllMembers[j], AllMembers[i]];
    }

    const temp_batches =  [];
    const totalMembers = AllMembers.length;
    const no_of_batches = Math.floor(totalMembers / size);
    const extraMembers = totalMembers % size;

    // Form initial groups
    for (let i = 0; i < no_of_batches; i++) {
      const start = i * size;
      const end = start + size;
      temp_batches.push(AllMembers.slice(start, end));
    }

    // Handle extra members
    if (extraMembers > 0) {
      if (bestDistribution) {
        // Distribute extra members to existing groups in round-robin fashion
        for (let i = 0; i < extraMembers; i++) {
          temp_batches[i % no_of_batches].push(AllMembers[no_of_batches * size + i]);
        }
      } else {
        // Form a new group for the extra members
        const start = no_of_batches * size;
        const end = start + extraMembers;
        temp_batches.push(AllMembers.slice(start, end));
      }
    }
    
    batches = temp_batches;
  };

  const genExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Groups");

    const groups = batches.map((batch: Array<string>, index: number) => ({
      title: `Group ${index + 1}`,
      members: batch,
    }));

    groups.forEach((group, index) => {
      // Add group title with bold font and font size 18
      const titleRow = worksheet.addRow([group.title]);
      titleRow.font = { bold: true, size: 18 };

      // Add members below the title
      group.members.forEach((member) => {
        const memberRow = worksheet.addRow([member]);
        memberRow.font = { size: 14 }; // Optional: Set a smaller font size for members
      });

      // Add a blank row between groups
      if (index < groups.length - 1) {
        worksheet.addRow([]);
      }
    });

    // Adjust column width for readability
    worksheet.columns.forEach((column) => {
      column.width = 20;
    });

    // Generate the Excel file as a Blob
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });

    saveAs(blob, "Groupify - File.xlsx");
  };

  const genWord = () => {
    const groupedData = batches.map((batch: Array<string>, index: number) => ({
      title: `Group ${index + 1}`,
      members: batch,
    }));

    // Initialize a new Document instance
    const doc = new Document({
      sections: [
        {
          children: groupedData.flatMap((group) => [
            // Group title as bold and larger font size
            new Paragraph({
              children: [
                new TextRun({
                  text: group.title,
                  bold: true,
                  size: 36,
                }),
              ],
              spacing: { after: 200 }, // Space after title
            }),
            // Group members each in a new paragraph
            ...group.members.map(
              (member) =>
                new Paragraph({
                  children: [new TextRun({ text: member, size: 28 })],
                })
            ),
            // Blank paragraph between groups
            new Paragraph(""),
          ]),
        },
      ],
    });

    // Generate the Word document as a Blob
    Packer.toBlob(doc).then((blob: Blob) => {
      saveAs(blob, "Groupify - File.docx");
    });
  };

  return (
    <div className="bg-white bg-opacity-70 backdrop-blur-lg grid grid-cols-2 gap-5 p-6 rounded-xl w-[700px]">
      <div className="space-y-2">
        <Textarea
          className="p-4 bg-zinc-200 h-full rounded-xl"
          placeholder="Enter Names Here"
          value={names}
          onChange={(e) => setNames(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-y-4 bg-cyan-900 p-4 rounded-xl shadow-lg">
        <Header />
        <div className="grid gap-2">
          <div className="flex bg-zinc-200 px-2 rounded-full">
            <Label
              className="w-full flex items-center text-base pl-2"
              htmlFor="group_size"
            >
              Group Size
            </Label>
            <Input
              className="border-0 flex-1 min-w-20"
              type="number"
              id="group_size"
              value={size}
              placeholder="0"
              onChange={(e) => setSize(parseInt(e.target.value))}
            />
          </div>
          <span className="text-xs text-right text-zinc-200 tracking-wide col-span-full opacity-90">
            Number of members per group
          </span>
        </div>
        <div className="grid bg-zinc-200 bg-opacity-10 backdrop-blur-lg gap-1 px-4 py-3 rounded-full">
          <div className="flex items-center justify-center space-x-4">
            <Switch
              id="best-distribution"
              checked={bestDistribution}
              onCheckedChange={setBestDistribution}
            />
            <Label htmlFor="best-distribution" className="text-white" asChild>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger className="cursor-help text-white">
                    Best Group Distribution
                  </TooltipTrigger>
                  <TooltipContent>
                    {bestDistribution
                      ? "Extra members will be distributed across existing groups for balanced sizes."
                      : "Extra members will form a new group, which may result in smaller groups."}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
          </div>
        </div>
        <div className="grid gap-1">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <Button
              onClick={() => setFormat("excel")}
              className={clsx("rounded-full", {
                "cursor-default": format === "excel",
              })}
              variant={format === "excel" ? "default" : "secondary"}
            >
              Excel
            </Button>
            <Button
              onClick={() => setFormat("word")}
              className={clsx("rounded-full", {
                "cursor-default": format === "word",
              })}
              variant={format === "word" ? "default" : "secondary"}
            >
              Word
            </Button>
            <span className="text-xs text-right text-zinc-200 tracking-wide col-span-full opacity-90">
              Document Download format
            </span>
          </div>
          <Button
            onClick={genFile}
            className="rounded-full mt-2"
            variant="secondary"
          >
            Generate File
          </Button>
        </div>
      </div>
      <footer className="col-span-full flex items-center justify-between">
        <div className="flex items-center justify-around gap-2">
          <HowToUse />
          {/* <Button variant="link">Donate to Project</Button> */}
          <Link href={appMeta.author.url} target="_blank" className={buttonVariants({ variant: "link" })}>
            About Me
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 pr-4">
          <span className="text-sm text-neutral-700 tracking-widest">
            Developed by Anthony Saah
          </span>
          <span className="text-xs text-muted-foreground">
            &copy; Copyright Groupify {new Date().getFullYear()}
          </span>
        </div>
      </footer>
    </div>
  );
}