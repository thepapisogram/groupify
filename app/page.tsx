"use client";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import clsx from "clsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import Link from "next/link";
import appMeta from "@/data/metadata";
import HowToUse from "@/components/how-to-use";
import Bgd from "@/components/bgd";

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

  const [showSettings, setShowSettings] = useState(false);

  const toggleConfig = () => {
    setShowSettings(!showSettings);
  }

  return (
    <div className="bg-white dark:bg-cyan-950 dark:bg-opacity-50 bg-opacity-70 backdrop-blur-lg grid md:grid-cols-2 gap-5 p-6 rounded-xl w-full h-max md:w-[700px]">
      <div className={clsx("space-y-2 md:block", { hidden: showSettings })}>
        <Textarea
          className="p-4 min-h-[379px] resize-none text-base bg-zinc-200 dark:bg-stone-950 dark:backdrop-blur-lg dark:border-stone-950 dark:text-cyan-500 tracking-widest h-full rounded-xl"
          placeholder="Enter Names Here"
          value={names}
          onChange={(e) => setNames(e.target.value)}
        />
      </div>
      <div
        className={`${
          showSettings ? "flex" : "hidden"
        } md:flex flex-col gap-y-6 md:gap-y-4 bg-cyan-900 dark:bg-stone-950 p-4 rounded-xl shadow-lg`}
      >
        <Header />
        <div className="grid gap-2">
          <div className="flex bg-zinc-200 dark:bg-zinc-800 p-2 rounded-full">
            <Label
              className="w-full flex items-center dark:text-cyan-500 text-base pl-2"
              htmlFor="group_size"
            >
              Group Size
            </Label>
            <input
              className="flex-1 min-w-20 dark:text-cyan-500 border-0 bg-transparent outline-0"
              type="number"
              value={size}
              placeholder="0"
              min={2}
              onChange={(e) => setSize(parseInt(e.target.value))}
            />
          </div>
          <span className="text-xs text-right text-zinc-200 dark:text-cyan-500 tracking-wide col-span-full opacity-90 dark:opacity-80">
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
            <Bgd val={bestDistribution} />
          </div>
        </div>
        <div className="grid gap-1">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <Button
              onClick={() => setFormat("excel")}
              className={clsx(
                "rounded-full border-2 border-transparent dark:hover:bg-stone-950 dark:text-white dark:bg-stone-900",
                {
                  "cursor-default dark:border-cyan-500 dark:text-cyan-500 dark:font-bold dark:bg-stone-950 dark:hover:bg-stone-950":
                    format === "excel",
                }
              )}
              variant={format === "excel" ? "default" : "secondary"}
            >
              Excel
            </Button>
            <Button
              onClick={() => setFormat("word")}
              className={clsx(
                "rounded-full border-2 border-transparent dark:hover:bg-stone-950 dark:text-white dark:bg-stone-900",
                {
                  "cursor-default dark:border-cyan-500 dark:text-cyan-500 dark:font-bold dark:bg-stone-950 dark:hover:bg-stone-950":
                    format === "word",
                }
              )}
              variant={format === "word" ? "default" : "secondary"}
            >
              Word
            </Button>
            <span className="text-xs text-right text-zinc-200 dark:text-cyan-500 tracking-wide col-span-full opacity-90 dark:opacity-80">
              Document Download format
            </span>
          </div>
          <Button
            onClick={genFile}
            className="rounded-full mt-3 dark:bg-cyan-900 dark:hover:bg-cyan-950 dark:text-zinc-300"
            variant="secondary"
          >
            Generate File
          </Button>
        </div>
      </div>
      <footer className="col-span-full flex flex-col md:flex-row items-center md:justify-between gap-2">
        <div className="flex items-center justify-around gap-2">
          <HowToUse />
          <Button
            className="md:hidden dark:bg-cyan-900 hover:bg-cyan-950 dark:text-zinc-300"
            onClick={toggleConfig}
          >
            Show {showSettings ? "Input" : "Settings"}
          </Button>
          <Link
            href={appMeta.author.url}
            target="_blank"
            className={`${buttonVariants({
              variant: "link",
            })} dark:text-cyan-600`}
          >
            About Me
          </Link>
        </div>
        <div className="flex flex-col items-center md:items-end justify-center gap-1 dark:opacity-50">
          <span className="text-sm text-muted-foreground tracking-widest">
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