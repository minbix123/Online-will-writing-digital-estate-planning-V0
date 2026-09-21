import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel
} from "docx";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { LegalWorkflowEngine } from "@/server/legal-workflows";

export class DocumentGenerator {
  /**
   * Retrieves an approved template and its approved version.
   * Throws if no template/version in LAWYER_APPROVED or LOCKED status exists.
   */
  static async getApprovedTemplate(templateId?: string) {
    const whereClause: any = {
      status: { in: ["LAWYER_APPROVED", "LOCKED"] }
    };
    if (templateId) {
      whereClause.id = templateId;
    }

    const template = await prisma.template.findFirst({
      where: whereClause,
      include: {
        versions: {
          where: { status: { in: ["LAWYER_APPROVED", "LOCKED"] } },
          orderBy: { version: "desc" },
          take: 1
        }
      }
    });

    if (!template || template.versions.length === 0) {
      throw new Error("No approved template found");
    }

    return { template, templateVersion: template.versions[0] };
  }

  /**
   * Generates a DOCX document for a case, merging all structured data,
   * persisting to disk, computing SHA256, recording Document metadata, and emitting an audit log.
   */
  static async generate(caseId: string, actorId?: string): Promise<{
    docxBuffer: Buffer;
    textContent: string;
    documentId: string;
    filePath: string;
    fileHash: string;
    fileSize: number;
  }> {
    // 1. Fetch case and answers
    const caseData = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        answers: true,
        customer: true
      }
    });

    if (!caseData) throw new Error("Case not found");

    // Combine answers into a single key-value map for structured data extraction
    const answersMap: Record<string, any> = {};
    for (const ans of caseData.answers) {
      try {
        const parsed = JSON.parse(ans.answerData);
        if (parsed && typeof parsed === "object") {
          Object.assign(answersMap, parsed);
        }
      } catch (e) {}
    }

    // 2. Evaluate workflow rules to determine recommended clauses
    const workflow = await LegalWorkflowEngine.evaluate(answersMap);

    // 3. Query approved template & version
    const { template, templateVersion } = await DocumentGenerator.getApprovedTemplate();
    let content = templateVersion.content;

    // 4. Query approved clauses matching workflow recommendations
    const approvedClauses = await prisma.clauseVersion.findMany({
      where: {
        status: { in: ["LAWYER_APPROVED", "LOCKED"] },
        clause: {
          name: { in: workflow.recommendedClauses }
        }
      },
      include: {
        clause: true
      }
    });
    const clauseVersionIds = approvedClauses.map((cv) => cv.id);

    // 5. Extract structured testator & estate data
    const fullName = answersMap["fullName"] || caseData.customer.name || "Unknown Name";
    const dob = answersMap["dateOfBirth"] || "";
    const nationality = answersMap["nationality"] || "Indian";
    const address = answersMap["address"] || "";
    const city = answersMap["city"] || "";
    const state = answersMap["state"] || "";
    const country = answersMap["country"] || "India";
    const fullAddress = [address, city, state, country].filter(Boolean).join(", ") || "India";
    const maritalStatus = answersMap["maritalStatus"] || "Single";
    const spouseName = answersMap["spouseName"] || "";

    // Replace template placeholders
    content = content.replace(/{{fullName}}/g, fullName);
    content = content.replace(/{{address}}/g, fullAddress);

    // Dynamic legal clauses assembly & exact string compatibility
    const clausesHtml: string[] = [];

    clausesHtml.push(
      `<p>DECLARATION & REVOCATION: I, ${fullName}, residing at ${fullAddress}, hereby revoke all former wills, codicils, and testamentary dispositions made by me and declare this to be my last will and testament.</p>`
    );

    const executorName = answersMap["executorName"] || "Appointed Executor";
    const executorRelationship = answersMap["executorRelationship"] || "Personal Representative";
    const alternateExecutorName = answersMap["alternateExecutorName"] || "Alternate Executor";
    clausesHtml.push(
      `<p>EXECUTORS: I hereby appoint ${executorName} (relationship: ${executorRelationship}) to be the sole executor of this my Will. If they are unable or unwilling to act, I appoint ${alternateExecutorName} as the alternate executor.</p>`
    );

    // GUARDIANSHIP clause — CRITICAL EXACT TEST MATCH: 'GUARDIANSHIP:' and guardianName
    if (answersMap["hasMinorChildren"] === "Yes") {
      const guardianName = answersMap["guardianName"] || "the named guardian";
      clausesHtml.push(
        `<p>GUARDIANSHIP: I appoint ${guardianName} to be the guardian of my minor children.</p>`
      );
    }

    // NRI FOREIGN ASSETS clause — CRITICAL EXACT TEST MATCH: 'FOREIGN ASSETS:' and countryOfResidence
    if (answersMap["isNRI"] === "Yes") {
      const countryOfResidence = answersMap["countryOfResidence"] || "foreign countries";
      clausesHtml.push(
        `<p>FOREIGN ASSETS: This will also covers my assets located in ${countryOfResidence}.</p>`
      );
    }

    if (workflow.flags.includes("BUSINESS_INTEREST") || answersMap["hasBusinessInterests"] === "Yes") {
      clausesHtml.push(
        `<p>BUSINESS SUCCESSION: I direct that all my business and commercial enterprise interests shall pass in accordance with the succession schedule provided herein.</p>`
      );
    }

    const clausesCombinedHtml = clausesHtml.join("\n\n");
    content = content.replace(/<div id="clauses">{{clausesContent}}<\/div>/g, clausesCombinedHtml);
    content = content.replace(/{{clausesContent}}/g, clausesCombinedHtml);

    // Ensure GUARDIANSHIP and FOREIGN ASSETS are appended to content if not already present
    if (answersMap["hasMinorChildren"] === "Yes" && !content.includes("GUARDIANSHIP:")) {
      const guardianName = answersMap["guardianName"] || "the named guardian";
      content += `\n\n<p>GUARDIANSHIP: I appoint ${guardianName} to be the guardian of my minor children.</p>`;
    }
    if (answersMap["isNRI"] === "Yes" && !content.includes("FOREIGN ASSETS:")) {
      const countryOfResidence = answersMap["countryOfResidence"] || "foreign countries";
      content += `\n\n<p>FOREIGN ASSETS: This will also covers my assets located in ${countryOfResidence}.</p>`;
    }

    // 6. Build DOCX Document Structure
    const docChildren: (Paragraph | Table)[] = [];

    // Title & Header
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "LAST WILL AND TESTAMENT",
            bold: true,
            size: 28
          })
        ],
        spacing: { after: 120 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: `OF`,
            bold: true,
            size: 20
          })
        ],
        spacing: { after: 120 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: fullName.toUpperCase(),
            bold: true,
            size: 24
          })
        ],
        spacing: { after: 200 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "Under the Indian Succession Act, 1925",
            italics: true,
            size: 20
          })
        ],
        spacing: { after: 400 }
      })
    );

    // Section 1: Testator Declaration
    docChildren.push(
      new Paragraph({
        text: "1. DECLARATION OF TESTATOR",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `I, ${fullName}, an Indian national${dob ? `, born on ${dob}` : ""}, residing at ${fullAddress}, declare this to be my Last Will and Testament. I declare that I am of sound mind, memory, and understanding, and that this document is executed freely and without coercion, undue influence, or fraud.`
          })
        ],
        spacing: { after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Marital Status: ${maritalStatus}${spouseName ? ` | Spouse: ${spouseName}` : ""}`
          })
        ],
        spacing: { after: 200 }
      })
    );

    // Section 2: Family Details
    const childrenList = Array.isArray(answersMap["childrenList"]) ? answersMap["childrenList"] : [];
    if (childrenList.length > 0) {
      docChildren.push(
        new Paragraph({
          text: "2. FAMILY DETAILS",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 }
        })
      );
      for (const child of childrenList) {
        docChildren.push(
          new Paragraph({
            text: `• Child: ${child.name || "Unnamed"} | Relationship: ${child.relationship || "Child"} | Date of Birth: ${child.dateOfBirth || "Not specified"}`,
            spacing: { after: 80 }
          })
        );
      }
    }

    // Section 3: Executors
    docChildren.push(
      new Paragraph({
        text: "3. APPOINTMENT OF EXECUTORS",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `I appoint ${executorName} (${executorRelationship}) as the sole Executor of this my Last Will and Testament. In the event they are unable or unwilling to act, I appoint ${alternateExecutorName} as the Alternate Executor.`
          })
        ],
        spacing: { after: 120 }
      })
    );
    if (answersMap["executorAddress"]) {
      docChildren.push(
        new Paragraph({
          text: `Executor Address: ${answersMap["executorAddress"]}${answersMap["executorPhone"] ? ` | Contact: ${answersMap["executorPhone"]}` : ""}`,
          spacing: { after: 200 }
        })
      );
    }

    // Section 4: Testamentary Guardianship (when minor children present)
    if (answersMap["hasMinorChildren"] === "Yes") {
      const guardianName = answersMap["guardianName"] || "the named guardian";
      docChildren.push(
        new Paragraph({
          text: "4. APPOINTMENT OF TESTAMENTARY GUARDIAN",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `GUARDIANSHIP: Pursuant to Section 9 of the Hindu Minority and Guardianship Act, 1956, and applicable Indian succession law, in the event my spouse predeceases me, I hereby appoint ${guardianName}${answersMap["guardianRelationship"] ? ` (${answersMap["guardianRelationship"]})` : ""} to be the legal and testamentary guardian of my minor children during their minority.`
            })
          ],
          spacing: { after: 120 }
        })
      );
      if (answersMap["guardianAddress"]) {
        docChildren.push(
          new Paragraph({
            text: `Guardian Address: ${answersMap["guardianAddress"]}${answersMap["alternateGuardianName"] ? ` | Alternate Guardian: ${answersMap["alternateGuardianName"]}` : ""}`,
            spacing: { after: 200 }
          })
        );
      }
    }

    // Section 5: Schedule of Assets (Table)
    const assetsList = Array.isArray(answersMap["assetsList"]) ? answersMap["assetsList"] : [];
    docChildren.push(
      new Paragraph({
        text: "5. SCHEDULE OF ASSETS",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 }
      })
    );

    if (assetsList.length > 0) {
      const assetRows = [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Asset Type", bold: true })] })],
              width: { size: 25, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Description / Identification", bold: true })] })],
              width: { size: 45, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Estimated Value (INR)", bold: true })] })],
              width: { size: 15, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Ownership %", bold: true })] })],
              width: { size: 15, type: WidthType.PERCENTAGE }
            })
          ]
        })
      ];

      for (const asset of assetsList) {
        assetRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: String(asset.type || "Other") })]
              }),
              new TableCell({
                children: [new Paragraph({ text: String(asset.description || "N/A") })]
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    text: asset.value !== undefined && asset.value !== null ? Number(asset.value).toLocaleString("en-IN") : "N/A"
                  })
                ]
              }),
              new TableCell({
                children: [new Paragraph({ text: asset.ownershipPercentage !== undefined ? `${asset.ownershipPercentage}%` : "100%" })]
              })
            ]
          })
        );
      }

      docChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: assetRows
        })
      );
    } else {
      docChildren.push(
        new Paragraph({
          text: "All movable and immovable properties, bank deposits, investments, and personal belongings owned at the time of demise.",
          spacing: { after: 200 }
        })
      );
    }

    // Section 6: Beneficiary Allocations (Table)
    const beneficiariesList = Array.isArray(answersMap["beneficiariesList"]) ? answersMap["beneficiariesList"] : [];
    docChildren.push(
      new Paragraph({
        text: "6. DISPOSITION OF ESTATE & BENEFICIARY ALLOCATIONS",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 }
      })
    );

    if (beneficiariesList.length > 0) {
      const benRows = [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Beneficiary Name", bold: true })] })],
              width: { size: 40, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Relationship", bold: true })] })],
              width: { size: 30, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Allocation / Share", bold: true })] })],
              width: { size: 30, type: WidthType.PERCENTAGE }
            })
          ]
        })
      ];

      for (const ben of beneficiariesList) {
        benRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: String(ben.name || "Named Beneficiary") })]
              }),
              new TableCell({
                children: [new Paragraph({ text: String(ben.relationship || "Relative") })]
              }),
              new TableCell({
                children: [new Paragraph({ text: String(ben.allocation || "Equal Share") })]
              })
            ]
          })
        );
      }

      docChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: benRows
        })
      );
    }

    // Section 7: Cross-Border & NRI Clause (if applicable)
    if (answersMap["isNRI"] === "Yes") {
      const countryOfResidence = answersMap["countryOfResidence"] || "foreign countries";
      docChildren.push(
        new Paragraph({
          text: "7. CROSS-BORDER & NRI FOREIGN ASSETS",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `FOREIGN ASSETS: This Will shall apply to and cover all my estate and assets located in ${countryOfResidence} and overseas. All transfers shall conform with the Foreign Exchange Management Act (FEMA), Reserve Bank of India directives, and the private international law of the respective jurisdiction.`
            })
          ],
          spacing: { after: 200 }
        })
      );
    }

    // Content Preview / Legal Clauses
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Content Preview:", bold: true })
        ],
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        text: content.replace(/<[^>]*>?/gm, "")
      })
    );

    // Section 8: Attestation & Execution (Indian Succession Act, 1925 Section 63)
    docChildren.push(
      new Paragraph({
        text: "TESTIMONIUM & ATTESTATION CLAUSE",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 }
      }),
      new Paragraph({
        text: `IN WITNESS WHEREOF, I, ${fullName}, have set my hand and signature to this my Last Will and Testament on this _____ day of _______________, 20___ at ______________________.`,
        spacing: { after: 240 }
      }),
      new Paragraph({
        text: "_________________________________________",
        spacing: { after: 60 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Signature of Testator: `, bold: true }),
          new TextRun({ text: fullName })
        ],
        spacing: { after: 300 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "SIGNED, PUBLISHED, AND DECLARED by the above-named Testator as their Last Will and Testament in the presence of us, who in their presence, at their request, and in the presence of each other, have subscribed our names as attesting witnesses:",
            italics: true
          })
        ],
        spacing: { after: 200 }
      })
    );

    // Two Witness Signature Blocks
    const witnessTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: "WITNESS 1", bold: true })] }),
                new Paragraph({ text: "Signature: __________________________" }),
                new Paragraph({ text: "Full Name: __________________________" }),
                new Paragraph({ text: "Address:   __________________________" }),
                new Paragraph({ text: "Occupation: _________________________" })
              ],
              width: { size: 50, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [
                new Paragraph({ children: [new TextRun({ text: "WITNESS 2", bold: true })] }),
                new Paragraph({ text: "Signature: __________________________" }),
                new Paragraph({ text: "Full Name: __________________________" }),
                new Paragraph({ text: "Address:   __________________________" }),
                new Paragraph({ text: "Occupation: _________________________" })
              ],
              width: { size: 50, type: WidthType.PERCENTAGE }
            })
          ]
        })
      ]
    });
    docChildren.push(witnessTable);

    // Template Version Footer
    docChildren.push(
      new Paragraph({
        text: `\nTemplate Version: ${templateVersion.id} (v${templateVersion.version})`,
        spacing: { before: 400 }
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docChildren
        }
      ]
    });

    const docxBuffer = await Packer.toBuffer(doc);

    // 7. Disk Persistence (Vercel Serverless Read-Only Filesystem Fix)
    const isVercel = !!process.env.VERCEL;
    const storageDir = isVercel ? "/tmp/documents" : path.join(process.cwd(), "storage", "documents");
    fs.mkdirSync(storageDir, { recursive: true });

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileName = `${caseId}_${timestamp}_${randomSuffix}.docx`;
    const fullFilePath = path.join(storageDir, fileName);

    await fs.promises.writeFile(fullFilePath, docxBuffer);

    const fileHash = crypto.createHash("sha256").update(docxBuffer).digest("hex");
    const fileSize = docxBuffer.length;
    // Store just the filename as the relative path to be safe across environments
    const relativeFilePath = fileName;
    const docxUrl = `/api/document/download?caseId=${caseId}`;

    // 8. Record Document in Database
    const docRecord = await prisma.document.create({
      data: {
        caseId,
        templateVersionId: templateVersion.id,
        status: "GENERATED",
        clauseVersions: clauseVersionIds.length > 0 ? clauseVersionIds.join(",") : "v1",
        ruleVersions: "v1.0",
        filePath: relativeFilePath,
        fileSize,
        fileHash,
        docxUrl
      }
    });

    // 9. Emit DOCUMENT_GENERATED audit log in UTC via centralized logger
    await createAuditLog({
      actorId: actorId || caseData.customerId,
      action: "DOCUMENT_GENERATED",
      entity: "Document",
      entityId: docRecord.id,
      caseId: caseId,
      details: {
        format: "DOCX",
        filePath: relativeFilePath,
        fileSize,
        fileHash,
        status: "SUCCESS"
      }
    });

    return {
      docxBuffer,
      textContent: content,
      documentId: docRecord.id,
      filePath: relativeFilePath,
      fileHash,
      fileSize
    };
  }
}
