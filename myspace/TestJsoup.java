import org.jsoup.Jsoup;

public class TestJsoup {
    public static void main(String[] args) {
        String html1 = "<div class=\"editor-media-wrapper\"><img src=\"something.jpg\" /></div><div>Xin chào đây là test</div>";
        System.out.println("HTML1 text: [" + Jsoup.parse(html1).text() + "]");
        
        String html2 = "<img src=\"something.jpg\" /><br>Một hai ba";
        System.out.println("HTML2 text: [" + Jsoup.parse(html2).text() + "]");
    }
}
