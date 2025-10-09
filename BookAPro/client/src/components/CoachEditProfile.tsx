import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus, Upload, MapPin, DollarSign, Award, Camera, Star, Calendar as CalendarIcon, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ObjectUploader } from "@/components/ObjectUploader";
import LocationAutocomplete from "@/components/LocationAutocomplete";

// VALIDATION SCHEMA
const coachEditSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(4, "Password must be at least 6 characters").optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  bio: z.string().min(50, "Bio must be at least 50 characters").max(500, "Bio must be less than 500 characters"),
  location: z.string().min(3, "Location is required"),
  pricePerHour: z.coerce.number().min(25, "Minimum price is $25").max(500, "Maximum price is $500"),
  yearsExperience: z.coerce.number().min(1, "At least 1 year of experience required").max(50, "Maximum 50 years"),
  pgaCertificationId: z.string().min(3, "PGA certification/ID is required").max(50, "PGA certification/ID must be less than 50 characters"),
  responseTime: z.string().min(1, "Response time is required"),
  availability: z.string().min(1, "Availability is required"),
  googleReviewsUrl: z
    .union([
      z.string().url("Please enter a valid Google Reviews URL"),
      z.string().length(0)
    ])
    .optional(),
  image: z.string().optional().default(""),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  googleCalendarConnected: z.boolean().optional(),
  specialties: z.array(z.string()),
  tools: z.array(z.string()),
  certifications: z.array(z.string()),
  videos: z.array(z.object({
    title: z.string(),
    description: z.string(),
    thumbnail: z.string(),
    duration: z.string(),
    videoUrl: z.string(),
    isUploadingVideo: z.boolean().optional(),
    isUploadingThumbnail: z.boolean().optional()
  }))
});

type CoachEditForm = z.infer<typeof coachEditSchema>;

const GOLF_SPECIALTIES = [
  "Swing Analysis", "Putting", "Short Game", "Course Strategy", "Mental Game",
  "Beginner Instruction", "Advanced Techniques", "Junior Programs",
  "Tournament Prep", "Fitness Training", "Injury Prevention", "Golf Etiquette"
];

const GOLF_TOOLS = [
  "TrackMan 4", "FlightScope X3", "GC Quad Launch Monitor", "Foresight Sports",
  "V1 Video Analysis", "OnForm Video App", "K-Coach Video Analysis", "3D Motion Capture",
  "SAM PuttLab", "BodiTrak Pressure Mat", "TPI Screen Tools", "K-Vest 3D Analysis",
  "Mirror Training Aid", "Alignment Sticks", "Impact Bag", "SKLZ Training Aids",
  "Resistance Bands", "Basic Video Setup"
];

const CERTIFICATIONS = [
  "PGA Class A Professional", "LPGA Class A Professional", "TPI Certified Level 1",
  "TPI Certified Level 2", "TPI Certified Level 3", "PGA Junior Certified",
  "Get Golf Ready Instructor", "NASM Certified Trainer", "Former PGA Tour Player",
  "Former LPGA Tour Player", "Master Professional", "Teaching Professional"
];

const RESPONSE_TIMES = [
  "Within 1 hour", "Within 2 hours", "Within 3 hours", "Within 4 hours",
  "Same day", "Within 24 hours", "Within 48 hours"
];

const AVAILABILITY_OPTIONS = [
  "Available today", "Available this week", "Available next week",
  "Available weekdays", "Available weekends", "Available evenings",
  "By appointment only"
];

// GOOGLE GEOCODE API KEY
const GOOGLE_GEOCODE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address) return null;
  const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`, { credentials: "include" });
  const data = await res.json();
  if (data.status === "OK" && data.results?.[0]) {
    const { lat, lng } = data.results[0].geometry.location;
    return { lat, lng };
  }
  console.warn("Geocoding failed:", data.status, data.error_message);
  return null;
}

export default function CoachEditProfile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState("profile");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [videos, setVideos] = useState<Array<CoachEditForm["videos"][number]>>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);

  // New: geocoding UI state
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  const form = useForm<CoachEditForm>({
    resolver: zodResolver(coachEditSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      bio: "",
      location: "",
      pricePerHour: 75,
      yearsExperience: 5,
      pgaCertificationId: "",
      responseTime: "Within 24 hours",
      availability: "Available this week",
      googleReviewsUrl: "",
      image: "",
      latitude: undefined,
      longitude: undefined,
      googleCalendarConnected: false,
      specialties: [],
      tools: [],
      certifications: [],
      videos: [],
    },
  });

  // Load coach profile
  const { data: coachProfile, isLoading: loadingProfile } = useQuery({
    queryKey: ["coachProfile"],
    queryFn: async () => {
      const res = await fetch('/api/coaches/me', { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch coach profile");
      return await res.json();
    }
  });

  useEffect(() => {
    if (coachProfile) {
      form.reset({
        ...coachProfile,
        specialties: coachProfile.specialties || [],
        tools: coachProfile.tools || [],
        certifications: coachProfile.certifications || [],
        videos: coachProfile.videos || [],
        image: coachProfile.image || "",
        googleCalendarConnected: !!coachProfile.googleCalendarConnected,
      });
      setSelectedSpecialties(coachProfile.specialties || []);
      setSelectedTools(coachProfile.tools || []);
      setSelectedCertifications(coachProfile.certifications || []);
      setVideos(coachProfile.videos || []);
      setGoogleCalendarConnected(!!coachProfile.googleCalendarConnected);
    }
  }, [coachProfile, form]);

  // EDIT MUTATION
  const editCoachMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/coaches/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Update failed');
      }
      return result;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Profile Updated!",
        description: data.message || "Your coach profile was updated successfully.",
        duration: 5000,
      });
      setTimeout(() => setLocation("/profile"), 1200);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Google Calendar Connect/Disconnect
  const handleGoogleCalendarConnect = async () => {
    try {
      window.location.href = "/api/google/auth";
    } catch (error) {
      toast({ title: "Google Calendar Error", description: "Could not connect calendar", variant: "destructive" });
    }
  };
  const handleGoogleCalendarDisconnect = async () => {
    try {
      const response = await fetch("/api/google/calendar/disconnect", { method: "POST", credentials: "include" });
      if (response.ok) {
        setGoogleCalendarConnected(false);
        toast({ title: "Calendar Disconnected" });
      }
    } catch (error) {
      toast({ title: "Google Calendar Error", description: "Could not disconnect calendar", variant: "destructive" });
    }
  };

  // Profile image upload
const handleGetUploadParameters = async (uppyFile) => {
  const file = uppyFile.data;
  // Decide the final storage key on the client (or do it on the server)
  const objectPath = `profile-images/${Date.now()}_${file.name}`;

  const response = await fetch('/api/objects/upload', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      objectPath,                 // tell server where this will live
      contentType: file.type,
    }),
  });
  if (!response.ok) throw new Error('Failed to get upload URL');
  const { uploadURL } = await response.json();

  // Stash objectPath on the file for later
  uppyFile.meta = { ...(uppyFile.meta || {}), objectPath };

  return { method: 'PUT', url: uploadURL, headers: { 'Content-Type': file.type } };
};

const handleImageUploadComplete = async (result: any) => {
  setIsUploadingImage(true);
  try {
    if (!result.successful?.length) return;

    const uploadedFile = result.successful[0];
    const objectPath = uploadedFile?.meta?.objectPath;
    if (!objectPath) throw new Error("Missing objectPath from upload");

    // Use your proxy which generates a short-lived signed URL on every request
    const stableUrl = `/objects/${objectPath}`;

    // Set a stable URL in the form (NOT a blob: URL, NOT the upload PUT URL)
    form.setValue('image', stableUrl, { shouldValidate: true });
    toast({ title: "Profile Image Uploaded" });
  } catch (e: any) {
    toast({ title: "Upload Failed", description: e.message, variant: "destructive" });
  } finally {
    setIsUploadingImage(false);
  }
};

  // Video upload logic
  const handleVideoUpload = (videoIndex: number) => async (result: any) => {
    const updatedVideos = [...videos];
    updatedVideos[videoIndex].isUploadingVideo = false;
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const uploadUrl = uploadedFile.uploadURL;
      if (uploadUrl) {
        try {
          const response = await fetch('/api/objects/normalize-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ videoURL: uploadUrl })
          });
          if (response.ok) {
            const { objectPath } = await response.json();
            updatedVideos[videoIndex].videoUrl = objectPath;
            toast({ title: "Video Uploaded", description: "Your instructional video has been uploaded successfully." });
          } else {
            throw new Error('Failed to process uploaded video');
          }
        } catch (error) {
          toast({ title: "Video Processing Failed", description: "There was an error processing your uploaded video.", variant: "destructive" });
        }
      }
    }
    setVideos(updatedVideos);
  };

  const handleThumbnailUpload = (videoIndex: number) => async (result: any) => {
    const updatedVideos = [...videos];
    updatedVideos[videoIndex].isUploadingThumbnail = false;
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const uploadUrl = uploadedFile.uploadURL;
      if (uploadUrl) {
        try {
          const response = await fetch('/api/objects/normalize-thumbnail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ thumbnailURL: uploadUrl })
          });
          if (response.ok) {
            const { objectPath } = await response.json();
            updatedVideos[videoIndex].thumbnail = objectPath;
            toast({ title: "Thumbnail Uploaded", description: "Video thumbnail has been uploaded successfully." });
          } else {
            throw new Error('Failed to process uploaded thumbnail');
          }
        } catch (error) {
          toast({ title: "Thumbnail Processing Failed", description: "There was an error processing your uploaded thumbnail.", variant: "destructive" });
        }
      }
    }
    setVideos(updatedVideos);
  };

  // Video CRUD
  const addVideo = () => {
    setVideos([...videos, {
      title: "",
      description: "",
      thumbnail: "",
      duration: "0:00",
      videoUrl: "",
      isUploadingVideo: false,
      isUploadingThumbnail: false
    }]);
  };

  const removeVideo = (index: number) => setVideos(videos.filter((_, i) => i !== index));
  const updateVideo = (index: number, field: string, value: string) => {
    const updatedVideos = videos.map((video, i) => i === index ? { ...video, [field]: value } : video);
    setVideos(updatedVideos);
  };

  // Location input changes: accept string or object from LocationAutocomplete
  const handleLocationInput = (value: any) => {
    if (typeof value === "string") {
      form.setValue("location", value, { shouldValidate: true, shouldDirty: true });
    } else if (value && typeof value === "object") {
      // If your LocationAutocomplete returns lat/lng, use them immediately
      const locString = value.location || value.label || value.description || "";
      form.setValue("location", locString, { shouldValidate: true, shouldDirty: true });
      if (typeof value.latitude === "number" && typeof value.longitude === "number") {
        form.setValue("latitude", value.latitude, { shouldValidate: true });
        form.setValue("longitude", value.longitude, { shouldValidate: true });
      }
    }
  };

  // Debounced geocoding whenever the location string changes
  const locationValue = form.watch("location");
  useEffect(() => {
    // Clear error and skip short inputs
    if (!locationValue || locationValue.trim().length < 4) {
      setGeocodeError(null);
      return;
    }

    let cancelled = false;
    setIsGeocoding(true);
    setGeocodeError(null);

    const t = setTimeout(async () => {
      const coords = await geocodeAddress(locationValue.trim());
      if (cancelled) return;
      setIsGeocoding(false);
      if (coords) {
        form.setValue("latitude", coords.lat, { shouldValidate: true });
        form.setValue("longitude", coords.lng, { shouldValidate: true });
      } else {
        // Clear if not found
        form.setValue("latitude", undefined, { shouldValidate: true });
        form.setValue("longitude", undefined, { shouldValidate: true });
        setGeocodeError("Could not find that address. Please refine the address.");
      }
    }, 600); // debounce

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [locationValue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Submit handler
  const handleSubmit = async (data: CoachEditForm) => {
    if (isUploadingImage) {
      toast({
        title: "Please wait for the image upload to finish.",
        description: "Your changes will be saved once your profile image is uploaded.",
        variant: "destructive"
      });
      return;
    }

    editCoachMutation.mutate({
      ...data,
      specialties: selectedSpecialties,
      tools: selectedTools,
      certifications: selectedCertifications,
      videos,
      image: data.image,
      googleCalendarConnected
    });
  };

  if (loadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-pulse">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Edit Your Coach Profile</h1>
            <p className="text-muted-foreground">
              Update your information, pricing, and integrations
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="expertise">Expertise</TabsTrigger>
                  <TabsTrigger value="tools">Tools & Certs</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                </TabsList>
                {/* PROFILE TAB */}
                <TabsContent value="profile" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        Basic Profile
                      </CardTitle>
                      <CardDescription>
                        Edit your personal info and profile photo
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input placeholder="you@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Change Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="********" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="John Smith" {...field} data-testid="input-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio * (50-500 characters)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Tell potential students about your teaching philosophy, experience, and what makes you unique..."
                                className="min-h-24"
                                {...field}
                                data-testid="textarea-bio"
                              />
                            </FormControl>
                            <div className="text-sm text-muted-foreground">
                              {field.value?.length || 0}/500 characters
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="location"
                          render={() => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Location *
                              </FormLabel>
                              <FormControl>
                                {/* If LocationAutocomplete is stuck, temporarily replace with <Input> to test */}
                                <LocationAutocomplete
                                  value={locationValue}
                                  onChange={handleLocationInput}
                                />
                                {/* Fallback example: */}
                                {/* <Input
                                  value={locationValue || ""}
                                  onChange={(e) => handleLocationInput(e.target.value)}
                                  placeholder="123 Main St, City, State"
                                /> */}
                              </FormControl>
                              <div className="text-xs mt-1">
                                {isGeocoding && <span className="text-muted-foreground">Geocoding address…</span>}
                                {!isGeocoding && geocodeError && <span className="text-red-600">{geocodeError}</span>}
                              </div>
                              <FormMessage />
                              {/* Show coordinates & map preview if available */}
                              {form.watch("latitude") && form.watch("longitude") && (
                                <div className="mt-2">
                                  <div className="text-xs text-muted-foreground">
                                    Lat: {form.watch("latitude")}, Lng: {form.watch("longitude")}
                                  </div>
                                  <iframe
                                    title="Location Map"
                                    width="100%"
                                    height="200"
                                    style={{ border: 0, marginTop: 8 }}
                                    loading="lazy"
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={`https://www.google.com/maps?q=${form.watch("latitude")},${form.watch("longitude")}&z=15&output=embed`}
                                  />
                                </div>
                              )}
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="yearsExperience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Years Experience *</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" max="50" {...field} data-testid="input-experience" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="pgaCertificationId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Award className="w-4 h-4" />
                              PGA Certification/ID *
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter your PGA certification number or ID"
                                {...field}
                                data-testid="input-pga-certification"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="pricePerHour"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Price per Hour *
                              </FormLabel>
                              <FormControl>
                                <Input type="number" min="25" max="500" {...field} data-testid="input-price" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="responseTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Response Time *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-response-time">
                                    <SelectValue placeholder="Select response time" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {RESPONSE_TIMES.map((time) => (
                                    <SelectItem key={time} value={time}>{time}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="availability"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>General Availability *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-availability">
                                  <SelectValue placeholder="Select availability" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {AVAILABILITY_OPTIONS.map((availability) => (
                                  <SelectItem key={availability} value={availability}>{availability}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="googleReviewsUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Star className="w-4 h-4" />
                              Google Reviews URL (Optional)
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="https://g.page/r/your-business-name/review"
                                {...field}
                                data-testid="input-google-reviews-url"
                              />
                            </FormControl>
                            <div className="text-sm text-muted-foreground">
                              Link your Google Business profile reviews to show your star rating and attract more students
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {/* Profile Image Upload Section */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Profile Photo</Label>
                        <div className="flex items-center space-x-4">
                          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {form.watch("image") ? (
                              <img
                                src={form.watch("image")}
                                alt="Profile preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Camera className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={5242880}
                              onGetUploadParameters={handleGetUploadParameters}
                              onComplete={handleImageUploadComplete}
                            >
                              <button type="button" className="w-full sm:w-auto">
                                <Upload className="w-4 h-4 mr-2" />
                                {form.watch("image") ? 'Change Photo' : 'Upload Photo'}
                              </button>
                            </ObjectUploader>
                            <p className="text-sm text-muted-foreground mt-1">
                              JPG, PNG, GIF up to 5MB. Recommended: 400x400px
                            </p>
                            {isUploadingImage && (
                              <p className="text-sm text-primary mt-1">Uploading...</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Google Calendar Integration */}
                      <div className="space-y-3 pt-4">
                        <Label className="text-base font-medium flex items-center gap-2">
                          <CalendarIcon className="w-5 h-5" />
                          Google Calendar Sync
                          {googleCalendarConnected && (
                            <Badge variant="secondary" className="ml-2">Connected</Badge>
                          )}
                        </Label>
                        <div className="flex gap-2">
                          {!googleCalendarConnected ? (
                            <Button type="button" variant="outline" onClick={handleGoogleCalendarConnect} data-testid="button-google-calendar-connect">
                              <Link2 className="w-4 h-4 mr-2" />
                              Connect Google Calendar
                            </Button>
                          ) : (
                            <Button type="button" variant="destructive" onClick={handleGoogleCalendarDisconnect} data-testid="button-google-calendar-disconnect">
                              Disconnect Google Calendar
                            </Button>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Sync your lesson bookings with Google Calendar for easy scheduling. Two-way sync supported.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                {/* EXPERTISE TAB */}
                <TabsContent value="expertise" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Teaching Specialties
                      </CardTitle>
                      <CardDescription>
                        Select the areas where you excel as a golf instructor
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-base font-medium">Selected Specialties</Label>
                          <div className="flex flex-wrap gap-2 mt-2 min-h-12">
                            {selectedSpecialties.map((specialty) => (
                              <Badge key={specialty} variant="default" className="flex items-center gap-1">
                                {specialty}
                                <X
                                  className="w-3 h-3 cursor-pointer"
                                  onClick={() => removeSpecialty(specialty)}
                                />
                              </Badge>
                            ))}
                            {selectedSpecialties.length === 0 && (
                              <p className="text-sm text-muted-foreground flex items-center">
                                No specialties selected yet
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Available Specialties</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            {GOLF_SPECIALTIES.filter(specialty => !selectedSpecialties.includes(specialty))
                              .map((specialty) => (
                                <Button
                                  key={specialty}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addSpecialty(specialty)}
                                  className="justify-start text-left"
                                  data-testid={`button-add-specialty-${specialty.replace(/\s+/g, '-').toLowerCase()}`}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  {specialty}
                                </Button>
                              ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                {/* TOOLS & CERTS TAB */}
                <TabsContent value="tools" className="mt-6">
                  <div className="space-y-6">
                    {/* Tools Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Teaching Tools & Equipment</CardTitle>
                        <CardDescription>
                          What technology and equipment do you use in your lessons?
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-base font-medium">Selected Tools</Label>
                            <div className="flex flex-wrap gap-2 mt-2 min-h-12">
                              {selectedTools.map((tool) => (
                                <Badge key={tool} variant="secondary" className="flex items-center gap-1">
                                  {tool}
                                  <X
                                    className="w-3 h-3 cursor-pointer"
                                    onClick={() => removeTool(tool)}
                                  />
                                </Badge>
                              ))}
                              {selectedTools.length === 0 && (
                                <p className="text-sm text-muted-foreground flex items-center">
                                  No tools selected yet
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Available Tools</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                              {GOLF_TOOLS.filter(tool => !selectedTools.includes(tool))
                                .map((tool) => (
                                  <Button
                                    key={tool}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addTool(tool)}
                                    className="justify-start text-left"
                                    data-testid={`button-add-tool-${tool.replace(/\s+/g, '-').toLowerCase()}`}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    {tool}
                                  </Button>
                                ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {/* Certifications Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Professional Certifications</CardTitle>
                        <CardDescription>
                          List your golf teaching certifications and qualifications
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-base font-medium">Selected Certifications</Label>
                            <div className="flex flex-wrap gap-2 mt-2 min-h-12">
                              {selectedCertifications.map((certification) => (
                                <Badge key={certification} variant="default" className="flex items-center gap-1">
                                  {certification}
                                  <X
                                    className="w-3 h-3 cursor-pointer"
                                    onClick={() => removeCertification(certification)}
                                  />
                                </Badge>
                              ))}
                              {selectedCertifications.length === 0 && (
                                <p className="text-sm text-muted-foreground flex items-center">
                                  No certifications selected yet
                                </p>
                              )}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Available Certifications</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                              {CERTIFICATIONS.filter(cert => !selectedCertifications.includes(cert))
                                .map((certification) => (
                                  <Button
                                    key={certification}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addCertification(certification)}
                                    className="justify-start text-left"
                                    data-testid={`button-add-certification-${certification.replace(/\s+/g, '-').toLowerCase()}`}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    {certification}
                                  </Button>
                                ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                {/* CONTENT TAB */}
                <TabsContent value="content" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Instructional Videos
                      </CardTitle>
                      <CardDescription>
                        Upload videos showcasing your teaching methods (optional)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {videos.map((video, index) => (
                          <Card key={index}>
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-medium">Video {index + 1}</h4>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeVideo(index)}
                                  data-testid={`button-remove-video-${index}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label htmlFor={`video-title-${index}`}>Title</Label>
                                  <Input
                                    id={`video-title-${index}`}
                                    value={video.title}
                                    onChange={(e) => updateVideo(index, 'title', e.target.value)}
                                    placeholder="e.g., Basic Swing Fundamentals"
                                    data-testid={`input-video-title-${index}`}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`video-duration-${index}`}>Duration</Label>
                                  <Input
                                    id={`video-duration-${index}`}
                                    value={video.duration}
                                    onChange={(e) => updateVideo(index, 'duration', e.target.value)}
                                    placeholder="e.g., 3:45"
                                    data-testid={`input-video-duration-${index}`}
                                  />
                                </div>
                              </div>
                              <div className="mt-4">
                                <Label htmlFor={`video-description-${index}`}>Description</Label>
                                <Textarea
                                  id={`video-description-${index}`}
                                  value={video.description}
                                  onChange={(e) => updateVideo(index, 'description', e.target.value)}
                                  placeholder="Describe what students will learn from this video..."
                                  data-testid={`textarea-video-description-${index}`}
                                />
                              </div>
                              {/* Video File Upload */}
                              <div className="mt-4">
                                <Label className="text-base font-medium">Video File</Label>
                                <div className="flex items-center space-x-4 mt-2">
                                  <div className="flex-1">
                                    <ObjectUploader
                                      maxNumberOfFiles={1}
                                      maxFileSize={104857600} // 100MB for video files
                                      onGetUploadParameters={handleGetUploadParameters}
                                      onComplete={handleVideoUpload(index)}
                                      buttonClassName="w-full"
                                    >
                                      <Upload className="w-4 h-4 mr-2" />
                                      {video.videoUrl ? 'Change Video' : 'Upload Video'}
                                    </ObjectUploader>
                                    {video.isUploadingVideo && (
                                      <p className="text-sm text-primary mt-1">Uploading video...</p>
                                    )}
                                    {video.videoUrl && (
                                      <p className="text-sm text-green-600 mt-1">Video uploaded successfully</p>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  MP4, MOV, AVI up to 100MB. Recommended: 1080p or less for optimal streaming.
                                </p>
                              </div>
                              {/* Thumbnail Upload */}
                              <div className="mt-4">
                                <Label className="text-base font-medium">Thumbnail (Optional)</Label>
                                <div className="flex items-center space-x-4 mt-2">
                                  <div className="w-16 h-12 bg-muted flex items-center justify-center overflow-hidden rounded">
                                    {video.thumbnail ? (
                                      <img
                                        src={video.thumbnail}
                                        alt="Video thumbnail"
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Camera className="w-6 h-6 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <ObjectUploader
                                      maxNumberOfFiles={1}
                                      maxFileSize={5242880} // 5MB for thumbnails
                                      onGetUploadParameters={handleGetUploadParameters}
                                      onComplete={handleThumbnailUpload(index)}
                                      buttonClassName="w-full"
                                    >
                                      <Camera className="w-4 h-4 mr-2" />
                                      {video.thumbnail ? 'Change Thumbnail' : 'Upload Thumbnail'}
                                    </ObjectUploader>
                                    {video.isUploadingThumbnail && (
                                      <p className="text-sm text-primary mt-1">Uploading thumbnail...</p>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  JPG, PNG up to 5MB. Recommended: 16:9 aspect ratio (e.g., 1280x720px)
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addVideo}
                          className="w-full"
                          data-testid="button-add-video"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Video
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              <div className="flex justify-between mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation('/profile')}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  data-testid="button-save-edit"
                  disabled={isUploadingImage || editCoachMutation.isLoading}
                >
                  {isUploadingImage ? "Uploading..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}