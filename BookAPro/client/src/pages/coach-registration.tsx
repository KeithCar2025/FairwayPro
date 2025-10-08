import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import zxcvbn from "zxcvbn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus, MapPin, DollarSign, Award, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import LocationAutocomplete from "@/components/LocationAutocomplete";

// Validation schema for coach registration (includes email, password, confirmPassword)
const coachRegistrationSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    bio: z.string().min(50, "Bio must be at least 50 characters").max(500, "Bio must be less than 500 characters"),
    location: z.string().min(3, "Location is required"),
    pricePerHour: z.coerce.number().min(25, "Minimum price is $25").max(500, "Maximum price is $500"),
    yearsExperience: z.coerce.number().min(1, "At least 1 year of experience required").max(50, "Maximum 50 years"),
    pgaCertificationId: z.string().min(3, "PGA certification/ID is required").max(50, "PGA certification/ID must be less than 50 characters"),
    responseTime: z.string().min(1, "Response time is required"),
    availability: z.string().min(1, "Availability is required"),
    googleReviewsUrl: z.string().url("Please enter a valid Google Reviews URL").optional().or(z.literal("")),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type CoachRegistrationForm = z.infer<typeof coachRegistrationSchema>;

// Predefined options
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

export default function CoachRegistration() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState("profile");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [profileImageUrl] = useState<string>(""); // kept for form field but upload removed from registration

  // Password strength states
  const [pwScore, setPwScore] = useState<number>(0); // 0..4
  const [pwFeedback, setPwFeedback] = useState<string | null>(null);
  const minAcceptableScore = 3; // require 3+ (Good/Excellent)

  const form = useForm<CoachRegistrationForm>({
    resolver: zodResolver(coachRegistrationSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      bio: "",
      location: "",
      pricePerHour: 75,
      yearsExperience: 5,
      pgaCertificationId: "",
      responseTime: "Within 24 hours",
      availability: "Available this week",
      googleReviewsUrl: "",
      latitude: undefined,
      longitude: undefined,
    },
  });

  // Watch password field for strength scoring
  useEffect(() => {
    const pwd = form.getValues("password") || "";
    const name = form.getValues("name") || "";
    const email = form.getValues("email") || "";
    if (!pwd) {
      setPwScore(0);
      setPwFeedback(null);
      return;
    }
    try {
      const res = zxcvbn(pwd, [email, name]);
      setPwScore(res.score);
      const advice = res.feedback?.warning ? res.feedback.warning : (res.feedback?.suggestions?.join(" ") || null);
      setPwFeedback(advice);
    } catch (err) {
      setPwScore(0);
      setPwFeedback(null);
    }
  }, [form.watch("password"), form.watch("email"), form.watch("name")]); // react-hook-form's watch() triggers updates

  // Coach registration mutation
  const registerCoachMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/coaches/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('Non-2xx response:', response.status, result);
        throw new Error(result.error || 'Registration failed');
      }
      if (typeof result.error === 'string' && result.error) {
        throw new Error(result.error);
      }
      return result;
    },

    onSuccess: (data: any) => {
      toast({
        title: "Registration Submitted!",
        description: data.message || "Your coach profile is pending admin approval. You will be notified once approved.",
        duration: 5000,
      });

      setTimeout(() => {
        setLocation("/");
      }, 1200);

      queryClient.invalidateQueries({ queryKey: ['/api/coaches/search'] });
    },

    onError: (error: Error) => {
      console.error("Mutation error:", error);
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: CoachRegistrationForm) => {
    // enforce client-side zxcvbn threshold before sending
    if (pwScore < minAcceptableScore) {
      toast({ title: "Weak password", description: "Please choose a stronger password before submitting.", variant: "destructive" });
      return;
    }

    const completeData = {
      email: data.email,
      password: data.password,
      name: data.name,
      bio: data.bio,
      location: data.location,
      pricePerHour: data.pricePerHour,
      yearsExperience: data.yearsExperience,
      pgaCertificationId: data.pgaCertificationId,
      responseTime: data.responseTime,
      availability: data.availability,
      googleReviewsUrl: data.googleReviewsUrl || "",
      specialties: selectedSpecialties,
      tools: selectedTools,
      certifications: selectedCertifications,
      image: profileImageUrl || "",
      latitude: data.latitude,
      longitude: data.longitude,
    };

    registerCoachMutation.mutate(completeData);
  };

  const addSpecialty = (specialty: string) => {
    if (!selectedSpecialties.includes(specialty)) {
      setSelectedSpecialties([...selectedSpecialties, specialty]);
    }
  };
  const removeSpecialty = (specialty: string) => setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialty));
  const addTool = (tool: string) => {
    if (!selectedTools.includes(tool)) setSelectedTools([...selectedTools, tool]);
  };
  const removeTool = (tool: string) => setSelectedTools(selectedTools.filter(t => t !== tool));
  const addCertification = (cert: string) => {
    if (!selectedCertifications.includes(cert)) setSelectedCertifications([...selectedCertifications, cert]);
  };
  const removeCertification = (cert: string) => setSelectedCertifications(selectedCertifications.filter(c => c !== cert));

  // Helper for strength label/colors
  const scoreLabel = (score: number) => {
    switch (score) {
      case 0: return { label: "Very weak", color: "bg-red-500", pct: 20 };
      case 1: return { label: "Weak", color: "bg-orange-500", pct: 40 };
      case 2: return { label: "Fair", color: "bg-yellow-400", pct: 60 };
      case 3: return { label: "Good", color: "bg-green-500", pct: 80 };
      case 4: return { label: "Excellent", color: "bg-green-700", pct: 100 };
      default: return { label: "Very weak", color: "bg-red-500", pct: 0 };
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Become a Golf Coach</h1>
            <p className="text-muted-foreground">
              Join our platform and start teaching golf students in your area
            </p>
          </div>

          <Form {...form} onSubmit={form.handleSubmit(handleSubmit)}>
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="expertise">Expertise</TabsTrigger>
                <TabsTrigger value="tools">Tools & Certs</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Basic Profile
                    </CardTitle>
                    <CardDescription>
                      Tell students about yourself and your coaching style
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
                          <FormLabel>Password *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Create a password" {...field} />
                          </FormControl>
                          <FormMessage />
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 h-2 rounded">
                              <div
                                style={{ width: `${scoreLabel(pwScore).pct}%` }}
                                className={`${scoreLabel(pwScore).color} h-2 rounded`}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>{scoreLabel(pwScore).label}</span>
                              <span>{pwScore < minAcceptableScore ? "Password too weak" : "OK"}</span>
                            </div>
                            {pwFeedback && <div className="text-xs text-muted-foreground mt-1">{pwFeedback}</div>}
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password *</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Repeat password" {...field} />
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
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              Location *
                            </FormLabel>
                            <FormControl>
                              <LocationAutocomplete
                                value={field.value}
                                onChange={(locObj) => {
                                  field.onChange(locObj.location);
                                  form.setValue("latitude", locObj.latitude, { shouldValidate: true });
                                  form.setValue("longitude", locObj.longitude, { shouldValidate: true });
                                }}
                              />
                            </FormControl>
                            <FormMessage />
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

                    {/* Removed profile image uploader from registration.
                        Images and videos are handled in the profile editor post-approval. */}
                  </CardContent>
                </Card>
              </TabsContent>

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

              <TabsContent value="tools" className="mt-6">
                <div className="space-y-6">
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

              <TabsContent value="content" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      Content (optional)
                    </CardTitle>
                    <CardDescription>
                      Video and profile image uploads are handled in your profile editor after registration/approval.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      You can add instructional videos and a profile photo from your profile page once your coach account is created and approved. This helps keep the registration lightweight and speeds up approval.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation('/')}
                data-testid="button-cancel"
              >
                Cancel
              </Button>

              <div className="flex gap-2">
                {currentTab !== "profile" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const tabs = ["profile", "expertise", "tools", "content"];
                      const currentIndex = tabs.indexOf(currentTab);
                      if (currentIndex > 0) setCurrentTab(tabs[currentIndex - 1]);
                    }}
                    data-testid="button-previous"
                  >
                    Previous
                  </Button>
                )}

                {currentTab !== "content" ? (
                  <Button
                    type="button"
                    onClick={() => {
                      const tabs = ["profile", "expertise", "tools", "content"];
                      const currentIndex = tabs.indexOf(currentTab);
                      if (currentIndex < tabs.length - 1) setCurrentTab(tabs[currentIndex + 1]);
                    }}
                    data-testid="button-next"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={form.handleSubmit((data) => {
                      // Final client-side guard: require strong password and matching confirm
                      if (pwScore < minAcceptableScore) {
                        toast({ title: "Weak password", description: "Please choose a stronger password before submitting.", variant: "destructive" });
                        return;
                      }
                      handleSubmit(data);
                    })}
                    data-testid="button-complete-registration"
                  >
                    Complete Registration
                  </Button>
                )}
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}