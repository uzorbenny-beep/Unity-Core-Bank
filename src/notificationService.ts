/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BankUser, BankNotification } from "./types";
import { saveUsersData, loadUsersData } from "./mockData";
import { dbService, getActiveMode } from "./dbService";

// Helper to trigger custom window event for in-app push banners
export function dispatchInAppAlert(notification: BankNotification) {
  if (typeof window !== "undefined") {
    const event = new CustomEvent("new-bank-notification", { detail: notification });
    window.dispatchEvent(event);
  }
}

/**
 * Centered generator for highly styled, responsive HTML emails simulating true banking grade receipts
 */
export function generateBankingHtmlEmail(
  name: string,
  title: string,
  preheader: string,
  paragraphs: string[],
  actionBox?: { label: string; code: string; sublabel?: string }
): string {
  const codeHtml = actionBox
    ? `
    <div style="background-color: #0c152d; border: 1px solid #1e293b; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <span style="font-size: 11px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 2px; color: #64748b; display: block; margin-bottom: 8px;">${actionBox.label}</span>
      <span style="font-size: 32px; font-weight: bold; font-family: 'JetBrains Mono', monospace; color: #60a5fa; letter-spacing: 4px; display: block;">${actionBox.code}</span>
      ${actionBox.sublabel ? `<span style="font-size: 11px; color: #a1a1aa; font-style: italic; display: block; margin-top: 8px;">${actionBox.sublabel}</span>` : ""}
    </div>
  `
    : "";

  const paragraphsHtml = paragraphs
    .map(p => `<p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-bottom: 16px;">${p}</p>`)
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #020617; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
      <div style="display: none; font-size: 1px; color: #020617; line-height: 1px; font-family: sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        ${preheader}
      </div>
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #020617; table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 16px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #090e24; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);">
              <!-- Header Section -->
              <tr>
                <td style="background-color: #030712; padding: 24px; border-bottom: 1px solid #131d35; text-align: left;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td>
                        <span style="font-size: 16px; font-weight: 800; letter-spacing: 1.5px; color: #3b82f6; font-family: sans-serif;">UNITYCORE</span>
                        <span style="font-size: 11px; font-weight: 600; color: #64748b; letter-spacing: 1px; padding-left: 6px; font-family: monospace;">LEDGER v2.4</span>
                      </td>
                      <td align="right">
                        <span style="font-size: 9px; font-family: monospace; color: #10b981; background-color: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); padding: 4px 8px; border-radius: 6px;">● SECURE CONNECT</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Content Section -->
              <tr>
                <td style="padding: 32px 24px; text-align: left;">
                  <h2 style="font-size: 18px; font-weight: 700; color: #f8fafc; margin-top: 0; margin-bottom: 20px; letter-spacing: -0.5px;">Hello ${name},</h2>
                  ${paragraphsHtml}
                  ${codeHtml}
                  
                  <div style="margin-top: 32px; border-top: 1px solid #131d35; padding-top: 20px; font-size: 12px; color: #64748b; line-height: 1.5;">
                    💡 <strong>Tip:</strong> Unitycore Security Guard uses end-to-end device authorization signatures. Never disclose PIN codes, passcodes, or credentials to anyone, including bank representatives.
                  </div>
                </td>
              </tr>
              
              <!-- Footer Section -->
              <tr>
                <td style="background-color: #030712; padding: 24px; text-align: center; border-top: 1px solid #131d35;">
                  <p style="font-size: 11px; color: #475569; margin: 0 0 8px 0; line-height: 1.5;">
                    This transaction, auditing sequence and dynamic ledger notification complies with Basel III digital banking regulations. Securely signed by host server node <span style="font-family: monospace; color: #64748b;">CL-RUN-INGRESS</span>.
                  </p>
                  <p style="font-size: 10px; color: #334155; margin: 0;">
                    © ${new Date().getFullYear()} Unitycore Financial Systems Plc. London, UK. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export const notificationService = {
  /**
   * Universal action helper to dispatch email and push notifications for a user session
   */
  async triggerActivityAlert(
    user: BankUser,
    category: BankNotification["category"],
    title: string,
    body: string,
    richPayload?: {
      paragraphs?: string[];
      actionBox?: { label: string; code: string; sublabel?: string };
    }
  ): Promise<BankNotification[]> {
    console.log(`[Notification Service] Dispatching alerts for: ${user.username} (${category})`);

    const tz = (typeof localStorage !== 'undefined' ? localStorage.getItem('user_timezone') : null) || undefined;
    const formattedTime = new Date().toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz === 'auto' ? undefined : tz
    });

    const timestamp = Date.now();
    const recipientEmail = user.email || `${user.username}@unitycore-ledger.io`;

    // 1. Build Push Notification (Alert bubble on desktop/mobile lockscreen simulation)
    const pushNotification: BankNotification = {
      id: `push-${timestamp}-${Math.floor(Math.random() * 9000 + 1000)}`,
      type: "push",
      category,
      title,
      body,
      timestamp,
      isRead: false,
      recipient: user.phoneNumber || "+44 (0) 7700 900077",
    };

    // 2. Build Rich HTMLEmail Notification
    const paragraphs = richPayload?.paragraphs || [
      body,
      `Action context category: ${category.toUpperCase()}`,
      `Activity timestamp: ${new Date().toUTCString()}`,
    ];

    const htmlBody = generateBankingHtmlEmail(
      user.name || user.username,
      title,
      body,
      paragraphs,
      richPayload?.actionBox
    );

    const emailNotification: BankNotification = {
      id: `email-${timestamp}-${Math.floor(Math.random() * 9000 + 1000)}`,
      type: "email",
      category,
      title,
      body,
      htmlBody,
      timestamp,
      isRead: false,
      recipient: recipientEmail,
    };

    // Initialize user's notification store if it doesn't exist
    const oldNotifications = user.notifications || [];
    
    // Assemble the complete updated notifications stack with both notifications at the top
    const updatedNotifications = [emailNotification, pushNotification, ...oldNotifications];
    
    // Cap at most 40 notifications to keep document footprint clean and optimal for db limits
    if (updatedNotifications.length > 40) {
      updatedNotifications.splice(40);
    }

    // Set updated user properties
    const updatedUser: BankUser = {
      ...user,
      notifications: updatedNotifications,
      // Increment unread count by 2 (as we generated both matching Push and Email logs!)
      unreadNotifications: (user.unreadNotifications || 0) + 2,
    };

    // Save profile state back through our primary dbService (which handles real Firestore or fallback)
    try {
      await dbService.saveUser(updatedUser);
      console.log(`[Notification Service] Successfully updated profile state for ${user.username}`);
    } catch (saveError) {
      console.error("[Notification Service] Error persisting to primary database mode:", saveError);
    }

    // Trigger local memory sync for immediate reactivity (the applet reloads profile state)
    const localUsers = loadUsersData();
    const syncedList = [...localUsers.filter(u => u.id !== user.id), updatedUser];
    saveUsersData(syncedList);

    // Safe real-world SMTP dispatch trigger through Express API
    fetch("/api/notifications/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: recipientEmail,
        subject: title,
        html: htmlBody,
      }),
    }).then((res) => {
      if (!res.ok) {
        console.warn("[Notification Service] Email delivery service returned a non-ok status:", res.status);
      }
    }).catch((apiError) => {
      console.error("[Notification Service] Network or API error sending email notification:", apiError);
    });

    // Fire actual client-side animation alerts instantly in viewport!
    dispatchInAppAlert(pushNotification);
    dispatchInAppAlert(emailNotification);

    return updatedNotifications;
  },

  /**
   * Specific action triggers mapping user's requirements
   */

  // A. OTP Passcode Generation
  async sendOtpAuthenticationCode(user: BankUser, actionContext: string, code: string): Promise<void> {
    await this.triggerActivityAlert(
      user,
      "otp",
      "🔒 Action OTP Authorisation",
      `Dynamic security passcode generated for safe ledger clearance. Use numeric code ${code} to proceed.`,
      {
        paragraphs: [
          `You have initialized a secure action: <strong>${actionContext}</strong>.`,
          "To complete this process safely, verify your identity using the dynamic 🔒 Transaction Verification Passcode below.",
          "Our underwriting engine generated this temporary sequence. Keep it confidential to protect your ledger nodes."
        ],
        actionBox: {
          label: "🔒 VERIFICATION PASSCODE",
          code,
          sublabel: "Expires in 3 minutes"
        }
      }
    );
  },

  // B. Registration Success
  async sendRegistrationNotification(user: BankUser, initialDeposit: number): Promise<void> {
    const routingIban = user.iban || "GB 89 UCBU 2053 3833 6423";
    await this.triggerActivityAlert(
      user,
      "registration",
      "🚀 Welcome to Unitycore Secure Ledger Engine",
      `Your decentralized ledger node has been successfully activated. Welcome, ${user.name}!`,
      {
        paragraphs: [
          "Congratulations! You have completed regulatory compliance and initialized your personal Unitycore vault dashboard.",
          `Your active accounts are now securely provisioned under currency: <strong>${user.currency || "USD"}</strong>.`,
          `Primary ledger root is set: <strong style="font-family: monospace;">${routingIban}</strong>.`,
          initialDeposit > 0 
            ? `Your initial activation deposit of <strong>${(user.currency || "USD")} ${initialDeposit.toLocaleString()}</strong> has been fully validated and credited to your checking layout.`
            : "No activation deposits have been detected yet. Use 'Deposit Money' to seed checking nodes safely."
        ]
      }
    );
  },

  // C. Successful Login Security Alert
  async sendLoginAlert(user: BankUser): Promise<void> {
    const fakeIp = `192.168.1.${Math.floor(2 + Math.random() * 253)}`;
    const randomGeo = ["London, UK", "New York, US", "Zurich, CH", "Singapore", "Frankfurt, DE"][Math.floor(Math.random() * 5)];
    await this.triggerActivityAlert(
      user,
      "security",
      "🌐 Security Notice: Login Established",
      `Session established from node location ${randomGeo} at IP ${fakeIp}.`,
      {
        paragraphs: [
          "Our centralized system detected a successful authentication request for your user profile.",
          `📍 <strong>Location Node:</strong> ${randomGeo}`,
          `🌐 <strong>Connection IP:</strong> ${fakeIp}`,
          `⏰ <strong>Standard Time:</strong> ${new Date().toLocaleString("en-US", { timeZone: ((typeof localStorage !== 'undefined' ? localStorage.getItem('user_timezone') : null) || undefined) })}`,
          "If this was you, no action is required. If this connection appears suspicious, freeze your cards immediately and contact our internal support desk."
        ]
      }
    );
  },

  // D. Transaction Event Alerts (Debit or Credit)
  async sendTransactionAlert(
    user: BankUser,
    amount: number,
    description: string,
    type: "debit" | "credit",
    refCardNum?: string
  ): Promise<void> {
    const directionLabel = type === "credit" ? "Credit Deposit Received" : "Account Debit Approved";
    const symbol = type === "credit" ? "+" : "-";
    const colorHex = type === "credit" ? "#10b981" : "#ef4444";
    const cleanAmount = `${symbol}${user.currency || "USD"} ${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    await this.triggerActivityAlert(
      user,
      "transaction",
      `💸 Ledger Activity: ${directionLabel}`,
      `Ledger reference: ${description} for ${cleanAmount}.`,
      {
        paragraphs: [
          "A live transaction event was mapped to your Unitycore ledger profile.",
          `<span style="font-size: 24px; font-weight: 800; color: ${colorHex}; display: block; margin: 12px 0;">${cleanAmount}</span>`,
          `👤 <strong>Merchant / Target:</strong> ${description}`,
          `📁 <strong>Reference Hash:</strong> tx-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 90000)}`,
          refCardNum ? `💳 <strong>Card Suffix:</strong> ${refCardNum}` : "",
          "This activity has been appended to your personal ledger and is visible instantly under transaction dashboards."
        ]
      }
    );
  },

  // E. Support Tickets Alert
  async sendSupportTicketAlert(user: BankUser, ticketId: string, subject: string, action: string): Promise<void> {
    await this.triggerActivityAlert(
      user,
      "support",
      "💬 Support Dispatch Sync",
      `Support status updated: ${action} for incident log #${ticketId}.`,
      {
        paragraphs: [
          `Unitycore AI Customer Support desk has successfully synced your record: <strong>${subject}</strong>.`,
          `🛠️ <strong>Action Update:</strong> ${action}`,
          `🎫 <strong>Ticket Log Ref:</strong> ${ticketId}`,
          "Our helpdesk operators will review and map diagnostic reports back to you as soon as possible."
        ]
      }
    );
  },

  // F. Auto-Pay Scheduled Bill Alerts
  async sendBillerAlert(user: BankUser, billerName: string, amount: number): Promise<void> {
    const formattedAmount = `${user.currency || "USD"} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    await this.triggerActivityAlert(
      user,
      "biller",
      "📅 Auto-Pay Schedule Release",
      `Payment of ${formattedAmount} scheduled for ${billerName} has been processed.`,
      {
        paragraphs: [
          "This is an automated alert reminding you that your recurring auto-pay schedule has fired.",
          `🏢 <strong>Service Provider:</strong> ${billerName}`,
          `💸 <strong>Amount Transmitted:</strong> ${formattedAmount}`,
          "Funds were successfully released from checking layout. No manual action is required."
        ]
      }
    );
  },

  // G. Admin Approval/Rejection Decision
  async sendApprovalDecisionAlert(
    user: BankUser,
    transaction: any,
    decision: "approved" | "rejected",
    adminName: string
  ): Promise<void> {
    const isDeposit = transaction.amount >= 0;
    const typeLabel = isDeposit ? "Deposit" : "Withdrawal";
    const statusLabel = decision === "approved" ? "APPROVED" : "DECLINED";
    const statusSymbol = decision === "approved" ? "🟩" : "🟥";
    const formattedAmount = `${user.currency || "USD"} ${Math.abs(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    await this.triggerActivityAlert(
      user,
      "transaction",
      `🔔 Administrative Decision: ${statusLabel}`,
      `Your pending ${typeLabel} of ${formattedAmount} for "${transaction.description}" has been ${statusLabel.toLowerCase()} by Security Officer ${adminName}.`,
      {
        paragraphs: [
          `An administrative review has been completed for your pending ${typeLabel.toLowerCase()} by our Compliance Clearance team.`,
          `Status Summary:`,
          `- Decision: ${statusSymbol} ${statusLabel}`,
          `- Reference: ${transaction.description}`,
          `- Amount: ${formattedAmount}`,
          `- Authorized Officer: ${adminName}`,
          `- Timestamp: ${new Date().toLocaleString()}`,
          decision === "approved" 
            ? "The balance has been adjusted and credited successfully to your targeted account ledger." 
            : "The ledger clearance request has been voided. Please contact our administrative helpdesk for compliance details."
        ]
      }
    );
  }
};
