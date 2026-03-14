"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Check,
  Cloud,
  AlertCircle,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import type { CalDAVSettingsInfo, CalDAVCalendarInfo } from "@/types";

interface CalDAVSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: CalDAVSettingsInfo | null) => void;
}

export default function CalDAVSettingsModal({
  open,
  onClose,
  onSettingsChange,
}: CalDAVSettingsModalProps) {
  const [settings, setSettings] = useState<CalDAVSettingsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [calendars, setCalendars] = useState<CalDAVCalendarInfo[]>([]);
  const [selectedCalendarUrl, setSelectedCalendarUrl] = useState("");
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  // Load current settings
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    setSuccess("");
    fetch("/api/caldav/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setSettings(data);
          setUsername(data.username || "");
          setSelectedCalendarUrl(data.calendarUrl || "");
        } else {
          setSettings(null);
          setUsername("");
          setPassword("");
          setSelectedCalendarUrl("");
        }
      })
      .catch(() => setError("설정을 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, [open]);

  // Load calendars when settings exist
  useEffect(() => {
    if (!settings?.hasPassword) return;
    setLoadingCalendars(true);
    fetch("/api/caldav/calendars")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCalendars(data);
      })
      .catch(() => {})
      .finally(() => setLoadingCalendars(false));
  }, [settings?.hasPassword]);

  const handleConnect = async () => {
    if (!username || !password) {
      setError("Apple ID와 앱 전용 비밀번호를 입력해주세요.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/caldav/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setError(`서버 응답 오류 (${res.status}): ${text.slice(0, 200) || "빈 응답"}`);
        return;
      }
      if (!res.ok) {
        setError(data.error || "연결에 실패했습니다.");
        return;
      }
      setSettings(data);
      setSuccess("iCloud에 연결되었습니다! 캘린더를 선택하세요.");
      setPassword("");

      // Fetch calendars
      setLoadingCalendars(true);
      const calRes = await fetch("/api/caldav/calendars");
      const calData = await calRes.json();
      if (Array.isArray(calData)) setCalendars(calData);
      setLoadingCalendars(false);
    } catch (e) {
      setError(`연결 중 오류: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectCalendar = async (cal: CalDAVCalendarInfo) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/caldav/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarUrl: cal.url,
          calendarName: cal.displayName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "캘린더 선택에 실패했습니다.");
        return;
      }

      const data = await res.json();
      setSettings(data);
      setSelectedCalendarUrl(cal.url);
      setSuccess(`"${cal.displayName}" 캘린더가 연결되었습니다!`);
      onSettingsChange?.(data);
    } catch {
      setError("캘린더 선택 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("iCloud 캘린더 연동을 해제하시겠습니까?")) return;
    try {
      await fetch("/api/caldav/settings", { method: "DELETE" });
      setSettings(null);
      setUsername("");
      setPassword("");
      setCalendars([]);
      setSelectedCalendarUrl("");
      setSuccess("");
      onSettingsChange?.(null);
    } catch {
      setError("연동 해제 중 오류가 발생했습니다.");
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Cloud className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Apple 캘린더 연동
                </h2>
                <p className="text-xs text-gray-500">iCloud CalDAV</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              </div>
            ) : settings?.hasPassword && settings?.calendarUrl ? (
              /* Connected state */
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      연결됨
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-green-700">
                    <p>계정: {settings.username}</p>
                    <p>캘린더: {settings.calendarName || "선택됨"}</p>
                  </div>
                </div>

                {/* Calendar list for changing selection */}
                {calendars.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">
                      다른 캘린더 선택
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {calendars.map((cal) => (
                        <button
                          key={cal.url}
                          onClick={() => handleSelectCalendar(cal)}
                          disabled={saving}
                          className={clsx(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                            cal.url === selectedCalendarUrl
                              ? "bg-blue-50 text-blue-700 font-medium"
                              : "hover:bg-gray-50 text-gray-700"
                          )}
                        >
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: cal.color || "#6366f1",
                            }}
                          />
                          {cal.displayName}
                          {cal.url === selectedCalendarUrl && (
                            <Check className="w-3.5 h-3.5 ml-auto text-blue-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors w-full"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  연동 해제
                </button>
              </div>
            ) : (
              /* Setup form */
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-700 leading-relaxed">
                    <strong>준비물:</strong> Apple ID에서 생성한{" "}
                    <strong>앱 전용 비밀번호</strong>가 필요합니다.
                    <br />
                    appleid.apple.com → 로그인 및 보안 → 앱 전용 비밀번호
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Apple ID (이메일)
                  </label>
                  <input
                    type="email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your@icloud.com"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    앱 전용 비밀번호
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleConnect}
                  disabled={saving || !username || !password}
                  className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      연결 중...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-4 h-4" />
                      iCloud 연결
                    </>
                  )}
                </button>

                {/* Show calendar list after connection */}
                {settings?.hasPassword &&
                  !settings.calendarUrl &&
                  calendars.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        연동할 캘린더를 선택하세요
                      </p>
                      <div className="space-y-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-1">
                        {loadingCalendars ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          </div>
                        ) : (
                          calendars.map((cal) => (
                            <button
                              key={cal.url}
                              onClick={() => handleSelectCalendar(cal)}
                              disabled={saving}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm hover:bg-gray-50 transition-colors"
                            >
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: cal.color || "#6366f1",
                                }}
                              />
                              <span className="text-gray-800">
                                {cal.displayName}
                              </span>
                              {cal.description && (
                                <span className="text-xs text-gray-400 ml-auto truncate max-w-[120px]">
                                  {cal.description}
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-700">{success}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
