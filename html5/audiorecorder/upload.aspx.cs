using System;
using System.Web;
using System.IO;
using System.Collections;
using System.Data.SqlClient;
using System.Configuration;

namespace Audior
{
    public partial class Upload : System.Web.UI.Page
    {
        private const string UPLOAD_DIRECTORY = "/mp3/Original/"; 
        private IList extensions = new string[] { "mp3" };

        public static void CopyStream(Stream input, FileStream output)
		{
			byte[] buffer = new byte[8 * 1024];
			int len;
			while ( (len = input.Read(buffer, 0, buffer.Length)) > 0)
			{
				output.Write(buffer, 0, len);
			}    
		}

        protected void Page_Load(object sender, EventArgs e)
        {
            if (this.Request.Params["recordName"] == null || this.Request.Params["duration"] == null)
            {
                ErrorLog.Report("Audition Upload", "Audior Params Missing");
                Response.Write("save=no");
                return;
            }

            if (Request.InputStream == null)
            {
                ErrorLog.Report("Audition Upload", "Input Stream Missing");
                Response.Write("save=no");
                return;
            }

            try
            {
                Page_Load_safe();
            }
            catch (Exception ex)
            {
                ErrorLog.Report("Audition Upload", ex.Message);
                Response.Write("save=no");
                return;
            }
        }

        protected void Page_Load_safe()
        {
            //Check for Record Again to prevent extra files
            if (Session["AuditionID"] != null && Session["AuditionID"].ToString() != "Error")
            {
                //Recorded Again without submitting
                //delete Record and File
                try
                {
                    using (SqlConnection cnn = new SqlConnection(ConfigurationManager.ConnectionStrings["FCBHVRConn"].ConnectionString))
                    {
                        cnn.Open();
                        using (SqlCommand cmdDelete = new SqlCommand("SELECT mp3Link FROM Audition WHERE AuditionID = " + Session["AuditionID"] + "; DELETE FROM Audition WHERE AuditionID = " + Session["AuditionID"], cnn))
                        {
                            string AbandonedFile = cmdDelete.ExecuteScalar().ToString();
                            AbandonedFile = Server.MapPath("~/mp3/Original/" + AbandonedFile);
                            System.IO.File.Delete(AbandonedFile);
                        }
                    }
                }
                catch (Exception ex)
                {
                    ErrorLog.Report("Audition DeleteReRecord " + Session["AuditionID"].ToString(), ex.Message);
                    //Just leaves an orphan record/File. OK to ignore error
                }
            }

            //the recorderId value sent via flash vars from index.html
            //string recorderId = this.Request.Params["recorderId"];
                
            //the userId sent via flash vars from index.html
            //we had errors where this came across null. It isnt used anyway so no need to assign it a var
            //string userId = this.Request.Params["userId"];
                
            //the swf sends the name of the recording via the GET variable named "recordName"
            string recordName = this.Request.Params["recordName"];
                
            //the duration of the recorded audio file in seconds but accurate to the millisecond (like this: 4.322)
            string duration = this.Request.Params["duration"];
            //decimal goes on and on trim it  
            int idx = duration.IndexOf('.');
            if (idx != -1)
                duration = duration.Substring(0, idx + 3);

            // HttpPostedFile file = HttpContext.Current.Request.Files["Filedata"];
               
            string uploadDirectory = HttpContext.Current.Server.MapPath(UPLOAD_DIRECTORY);
			if (!Directory.Exists(uploadDirectory))
			{
				Directory.CreateDirectory(uploadDirectory);
			}

            Random rnd1 = new Random();
            int n = rnd1.Next();

            DateTime dt = DateTime.Now;
            string strDate = dt.ToString(System.Globalization.CultureInfo.InvariantCulture);
            strDate = strDate.Replace("/", "");
            strDate = strDate.Replace(":", "");
            strDate = strDate.Replace(" ", "");
               

            recordName = recordName.Replace(".mp3", "");
 
            recordName = recordName + strDate + "_" + n + ".mp3";       
    
            string uploadFile = Path.Combine(uploadDirectory, recordName);

               
			//Get the stream  
			Stream input = (Stream)Request.InputStream;

            using (FileStream file = File.OpenWrite(uploadFile))
			{
				CopyStream(input, file);
			}
                   
            string strmp3 = recordName;
          

            try
            {
                using (SqlConnection cnn = new SqlConnection(ConfigurationManager.ConnectionStrings["FCBHVRConn"].ConnectionString))
                {
                    cnn.Open();

                    string sqlInsert = "INSERT INTO Audition(mp3Link,AuditionDate,Duration)VALUES(@mp3Link,@AuditionDate,@Duration) SELECT SCOPE_IDENTITY()";
                    using (SqlCommand cmdIns = new SqlCommand(sqlInsert, cnn))
                    {
                        cmdIns.Parameters.AddWithValue("@mp3Link", strmp3);
                        cmdIns.Parameters.AddWithValue("@AuditionDate", dt);
                        cmdIns.Parameters.AddWithValue("@Duration", duration);

                        Session["AuditionID"] = cmdIns.ExecuteScalar().ToString();
                    }
                }
            }
            catch (Exception ex)
            {
                ErrorLog.Report("AuditionUpload", ex.Message);
                Session["AuditionID"] = "Error";// Creating Audition Record";
                //response = "save=no" would redirect to error page. Setting error in AuditionID instead will display it on page
            }

            string response = string.Empty;
            response = "save=ok&fileurl=/mp3/Original/" + recordName; //"save=ok&fileurl=VirtualRecording/auditions/" + recordName;
            Response.Write(response);                  
        }       
    }
}