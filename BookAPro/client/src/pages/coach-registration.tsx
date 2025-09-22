import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus, Upload, MapPin, DollarSign, Award, Camera, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";

// Validation schema for coach registration
const coachRegistrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  bio: z.string().min(50, "Bio must be at least 50 characters").max(500, "Bio must be less than 500 characters"),
  location: z.string().min(3, "Location is required"),
  pricePerHour: z.coerce.number().min(25, "Minimum price is $25").max(500, "Maximum price is $500"),
  yearsExperience: z.coerce.number().min(1, "At least 1 year of experience required").max(50, "Maximum 50 years"),
  pgaCertificationId: z.string().min(3, "PGA certification/ID is required").max(50, "PGA certification/ID must be less than 50 characters"),
  responseTime: z.string().min(1, "Response time is required"),
  availability: z.string().min(1, "Availability is required"),
  googleReviewsUrl: z.string().url("Please enter a valid Google Reviews URL").optional().or(z.literal("")),
  image: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
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
  const [videos, setVideos] = useState<Array<{
    title: string;
    description: string;
    thumbnail: string;
    duration: string;
    videoUrl: string;
    isUploadingVideo: boolean;
    isUploadingThumbnail: boolean;
  }>>([]);
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const form = useForm<CoachRegistrationForm>({
    resolver: zodResolver(coachRegistrationSchema),
    defaultValues: {
      name: "",
      bio: "",
      location: "",
      pricePerHour: 75,
      yearsExperience: 5,
      pgaCertificationId: "",
      responseTime: "Within 24 hours",
      availability: "Available this week",
      googleReviewsUrl: "",
      image: profileImageUrl,
      latitude: undefined,
      longitude: undefined,
    },
  });

  // Coach registration mutation
  const registerCoachMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/coaches/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Registration Submitted!",
        description: data.message || "Your coach profile is pending admin approval. You will be notified once approved.",
        duration: 5000,
      });
      setLocation('/');
      queryClient.invalidateQueries({ queryKey: ['/api/coaches/search'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: CoachRegistrationForm) => {
    const completeData = {
      ...data,
      specialties: selectedSpecialties,
      tools: selectedTools,
      certifications: selectedCertifications,
      videos: videos,
    };

    registerCoachMutation.mutate(completeData);
  };

  const addSpecialty = (specialty: string) => {
    if (!selectedSpecialties.includes(specialty)) {
      setSelectedSpecialties([...selectedSpecialties, specialty]);
    }
  };

  const removeSpecialty = (specialty: string) => {
    setSelectedSpecialties(selectedSpecialties.filter(s => s !== specialty));
  };

  const addTool = (tool: string) => {
    if (!selectedTools.includes(tool)) {
      setSelectedTools([...selectedTools, tool]);
    }
  };

  const removeTool = (tool: string) => {
    setSelectedTools(selectedTools.filter(t => t !== tool));
  };

  const addCertification = (certification: string) => {
    if (!selectedCertifications.includes(certification)) {
      setSelectedCertifications([...selectedCertifications, certification]);
    }
  };

  const removeCertification = (certification: string) => {
    setSelectedCertifications(selectedCertifications.filter(c => c !== certification));
  };

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

  const removeVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  const updateVideo = (index: number, field: string, value: string) => {
    const updatedVideos = videos.map((video, i) => 
      i === index ? { ...video, [field]: value } : video
    );
    setVideos(updatedVideos);
  };

  // Handle profile image upload
  const handleGetUploadParameters = async () => {
    const response = await fetch('/api/objects/upload', {
      method: 'POST',
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }
    
    const { uploadURL } = await response.json();
    return {
      method: 'PUT' as const,
      url: uploadURL,
    };
  };

  const handleImageUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    setIsUploadingImage(false);
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const uploadUrl = uploadedFile.uploadURL;
      
      if (uploadUrl) {
        try {
          // Normalize the upload URL to a proper object path and set ACL
          const response = await fetch('/api/objects/normalize-profile-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ imageURL: uploadUrl })
          });
          
          if (response.ok) {
            const { objectPath } = await response.json();
            setProfileImageUrl(objectPath);
            form.setValue('image', objectPath);
            toast({
              title: "Profile Image Uploaded",
              description: "Your profile image has been uploaded successfully.",
            });
          } else {
            throw new Error('Failed to process uploaded image');
          }
        } catch (error) {
          console.error('Error processing uploaded image:', error);
          toast({
            title: "Upload Processing Failed",
            description: "There was an error processing your uploaded image. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
  };

  // Handle video file upload
  const handleVideoUpload = (videoIndex: number) => async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    const updatedVideos = [...videos];
    updatedVideos[videoIndex].isUploadingVideo = false;
    
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const uploadUrl = uploadedFile.uploadURL;
      
      if (uploadUrl) {
        try {
          // Normalize the upload URL to a proper object path and set ACL for videos
          const response = await fetch('/api/objects/normalize-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ videoURL: uploadUrl })
          });
          
          if (response.ok) {
            const { objectPath } = await response.json();
            updatedVideos[videoIndex].videoUrl = objectPath;
            toast({
              title: "Video Uploaded",
              description: "Your instructional video has been uploaded successfully.",
            });
          } else {
            throw new Error('Failed to process uploaded video');
          }
        } catch (error) {
          console.error('Error processing uploaded video:', error);
          toast({
            title: "Video Processing Failed",
            description: "There was an error processing your uploaded video. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
    
    setVideos(updatedVideos);
  };

  // Handle thumbnail upload for videos
  const handleThumbnailUpload = (videoIndex: number) => async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    const updatedVideos = [...videos];
    updatedVideos[videoIndex].isUploadingThumbnail = false;
    
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const uploadUrl = uploadedFile.uploadURL;
      
      if (uploadUrl) {
        try {
          // Normalize the upload URL to a proper object path and set ACL for thumbnails
          const response = await fetch('/api/objects/normalize-thumbnail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ thumbnailURL: uploadUrl })
          });
          
          if (response.ok) {
            const { objectPath } = await response.json();
            updatedVideos[videoIndex].thumbnail = objectPath;
            toast({
              title: "Thumbnail Uploaded",
              description: "Video thumbnail has been uploaded successfully.",
            });
          } else {
            throw new Error('Failed to process uploaded thumbnail');
          }
        } catch (error) {
          console.error('Error processing uploaded thumbnail:', error);
          toast({
            title: "Thumbnail Processing Failed",
            description: "There was an error processing your uploaded thumbnail. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
    
    setVideos(updatedVideos);
  };

  const startVideoUpload = (index: number) => {
    const updatedVideos = [...videos];
    updatedVideos[index].isUploadingVideo = true;
    setVideos(updatedVideos);
  };

  const startThumbnailUpload = (index: number) => {
    const updatedVideos = [...videos];
    updatedVideos[index].isUploadingThumbnail = true;
    setVideos(updatedVideos);
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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
                  <TabsTrigger value="expertise" data-testid="tab-expertise">Expertise</TabsTrigger>
                  <TabsTrigger value="tools" data-testid="tab-tools">Tools & Certs</TabsTrigger>
                  <TabsTrigger value="content" data-testid="tab-content">Content</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        Basic Profile
                      </CardTitle>
                      <CardDescription>
                        Tell students about yourself and your coaching style
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                <Input placeholder="Pine Valley Golf Club" {...field} data-testid="input-location" />
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

                      {/* Profile Image Upload Section */}
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Profile Photo</Label>
                        <div className="flex items-center space-x-4">
                          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {profileImageUrl ? (
                              <img 
                                src={profileImageUrl} 
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
                              maxFileSize={5242880} // 5MB
                              onGetUploadParameters={handleGetUploadParameters}
                              onComplete={handleImageUploadComplete}
                              buttonClassName="w-full sm:w-auto"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {profileImageUrl ? 'Change Photo' : 'Upload Photo'}
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
                      type="submit"
                      disabled={registerCoachMutation.isPending}
                      data-testid="button-submit"
                    >
                      {registerCoachMutation.isPending ? "Creating Profile..." : "Complete Registration"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}